from fastapi import FastAPI, Depends, Query
from sqlalchemy import func, Integer, Float, select, case, cast, or_, and_
from sqlalchemy.orm import Session
from database import get_db
from models.extraction_model import Extraction, DocumentStats, FieldStats
from fastapi.middleware.cors import CORSMiddleware
from typing import List


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Allow all origins (for testing, use specific domains in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to the Extractly API"}


# Extraction Stats Dashbaord endpoint to fetch all records
@app.get("/extractions/")
def get_extractions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    extractions = db.query(Extraction).offset(skip).limit(limit).all()
    return {"data": extractions}


# Endpoint to fetch records by document_id
@app.get("/extractions/{document_id}")
def get_extraction_by_document_id(document_id: str, db: Session = Depends(get_db)):
    extractions = (
        db.query(Extraction).filter(Extraction.document_id == document_id).all()
    )
    return {"data": extractions}


# Document Accuracy Dashboard endpoint to fetch document stats
@app.get("/document_stats", response_model=List[DocumentStats])
def get_document_stats(
    db: Session = Depends(get_db),
    filename: str = Query(None, alias="filename"),  # Optional filter by filename
    document_id: str = Query(
        None, alias="document_id"
    ),  # Optional filter by document_id
):
    # Start the base query
    query = db.query(
        Extraction.document_id,
        Extraction.filename,
        func.avg(cast(Extraction.confidence, Float) * 1.0).label("avg_field_accuracy"),
        func.avg(Extraction.ocr_confidence).label("avg_ocr_accuracy"),
    ).filter(Extraction.confidence.isnot(None), Extraction.ocr_confidence.isnot(None))

    # Apply filters if provided
    if filename:
        query = query.filter(Extraction.filename.ilike(f"%{filename}%"))
    if document_id:
        query = query.filter(Extraction.document_id.ilike(f"%{document_id}%"))

    # Group by the necessary fields
    query = query.group_by(Extraction.document_id, Extraction.filename)

    stats = query.all()

    return [
        DocumentStats(
            document_id=row.document_id,
            filename=row.filename,
            avg_field_accuracy=row.avg_field_accuracy,
            avg_ocr_accuracy=row.avg_ocr_accuracy,
        )
        for row in stats
    ]


# Field Stats Dashboard endpoint to fetch field stats
@app.get("/extractions/field-stats/", response_model=List[FieldStats])
async def get_field_stats(db: Session = Depends(get_db)):
    stats = (
        db.query(
            Extraction.field_id,
            Extraction.field,
            func.avg(cast(Extraction.confidence, Float) * 1.0).label(
                "avg_field_accuracy"
            ),
            func.avg(cast(Extraction.ocr_confidence, Float) * 1.0).label(
                "avg_document_ocr_confidence"
            ),
        )
        .filter(
            and_(
                or_(
                    Extraction.confidence.isnot(None),
                    Extraction.ocr_confidence.isnot(None),
                ),
                Extraction.field != "items",
            )
        )
        .group_by(Extraction.field_id, Extraction.field)
        .all()
    )

    return [
        FieldStats(
            field_id=row.field_id,
            field=row.field,
            avg_field_accuracy=row.avg_field_accuracy,
            avg_document_ocr_confidence=row.avg_document_ocr_confidence,
        )
        for row in stats
    ]


# STP Dashboard endpoint to fetch STP data
@app.get("/stp_dashboard/")
def get_stp_dashboard(db: Session = Depends(get_db)):
    # Query: Model Output Accuracy by Document
    accuracy_query = (
        db.query(
            Extraction.filename,
            Extraction.document_id,
            func.count(Extraction.field_id).label("total_fields"),
            func.sum(cast(Extraction.is_correct, Integer)).label("correct_fields"),
            func.round(
                func.sum(cast(Extraction.is_correct, Integer))
                * 100.0
                / func.count(Extraction.field_id),
                2,
            ).label("accuracy_percentage"),
        )
        .group_by(Extraction.filename, Extraction.document_id)
        .all()
    )

    # Query: Overall STP Rate
    stp_subquery = (
        select(
            Extraction.filename,
            Extraction.document_id,
            func.sum(cast(Extraction.is_correct, Integer)).label("correct_count"),
            func.count(Extraction.field_id).label("total_count"),
        )
        .group_by(Extraction.filename, Extraction.document_id)
        .subquery()
    )

    overall_stp_query = (
        db.query(
            func.round(
                func.sum(
                    case(
                        (stp_subquery.c.correct_count == stp_subquery.c.total_count, 1),
                        else_=0,
                    )
                )
                * 100.0
                / func.count(),
                2,
            ).label("stp_rate_percentage")
        )
        .select_from(stp_subquery)
        .scalar()
    )

    # Format results
    accuracy_data = [
        {
            "filename": row.filename,
            "document_id": row.document_id,
            "total_fields": row.total_fields,
            "correct_fields": row.correct_fields,
            "accuracy_percentage": row.accuracy_percentage,
        }
        for row in accuracy_query
    ]

    overall_stp = {"stp_rate_percentage": overall_stp_query}

    return {
        "accuracy_data": accuracy_data,
        "overall_stp": overall_stp,
    }


# Endpoint to summarize stats
@app.get("/extractions/stats/")
def get_stats(db: Session = Depends(get_db)):
    total_docs = db.query(Extraction.document_id).distinct().count()
    total_fields = db.query(Extraction).count()
    correct_fields = db.query(Extraction).filter(Extraction.is_correct).count()
    return {
        "total_documents": total_docs,
        "total_fields": total_fields,
        "correct_fields": correct_fields,
    }
