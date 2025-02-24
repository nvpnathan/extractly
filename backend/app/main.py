from fastapi import FastAPI, Depends, Query, HTTPException
from sqlalchemy import func, Integer, Float, select, case, cast, or_, and_
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from api.discovery_routes import router as discovery_router
from models.classification_model import Classification
from models.extraction_model import Extraction, DocumentStats, FieldStats, FieldData


app = FastAPI()

# Include the discovery routes with dependencies
app.include_router(discovery_router, prefix="/api/discovery")


# Add CORS middleware to allow all origins
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


# Classification Confidence Distribution (Bar Chart)
@app.get("/classification_confidence")
def get_classification_confidence(db: Session = Depends(get_db)):
    data = (
        db.query(
            Classification.classifier_name,
            func.round(Classification.classification_confidence * 100, 2).label(
                "confidence_percentage"
            ),
            func.count(Classification.id).label("document_count"),
        )
        .group_by(Classification.classifier_name, "confidence_percentage")
        .all()
    )
    return [
        {
            "classifier_name": row.classifier_name,
            "confidence_percentage": row.confidence_percentage,
            "document_count": row.document_count,
        }
        for row in data
    ]


# Top Classifiers by Confidence
@app.get("/top_classifiers")
def get_top_classifiers(db: Session = Depends(get_db)):
    data = (
        db.query(
            Classification.classifier_name,
            func.round(
                func.avg(Classification.classification_confidence) * 100, 2
            ).label("average_confidence"),
        )
        .group_by(Classification.classifier_name)
        .order_by(func.avg(Classification.classification_confidence).desc())
        .limit(5)  # Top 5 classifiers
        .all()
    )
    return [
        {
            "classifier_name": row.classifier_name,
            "average_confidence": row.average_confidence,
        }
        for row in data
    ]


# Classification Accuracy by Document Type (Line Chart)
@app.get("/classification_accuracy")
def get_classification_accuracy(db: Session = Depends(get_db)):
    data = (
        db.query(
            Classification.document_type_id,
            func.round(
                func.avg(Classification.classification_confidence) * 100, 2
            ).label("accuracy"),
        )
        .group_by(Classification.document_type_id)
        .all()
    )
    return [
        {
            "document_type_id": row.document_type_id,
            "accuracy": row.accuracy,
        }
        for row in data
    ]


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


# Fetch field data via document_id
@app.get("/field_data", response_model=List[FieldData])
async def get_field_data(document_id: str, db: Session = Depends(get_db)):
    # Debugging: Log the received document_id
    print(f"Received document_id: {document_id}")

    # Query the database for field data based on document_id
    query = db.query(
        Extraction.field,
        Extraction.field_value,
        Extraction.validated_field_value,
        Extraction.is_correct,
        Extraction.confidence,
    ).filter(Extraction.document_id == document_id)

    results = query.all()

    # Handle case where no data is found
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No field data found for document ID: {document_id}",
        )

    # Format and return results
    return [
        FieldData(
            field=row.field,
            field_value=row.field_value,
            validated_field_value=row.validated_field_value,
            is_correct=row.is_correct,
            confidence=row.confidence,
        )
        for row in results
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
@app.get("/stp_dashboard")
def get_stp_dashboard(
    db: Session = Depends(get_db),
    filename: str = Query(None, alias="filename"),  # Optional filter by filename
    document_id: str = Query(
        None, alias="document_id"
    ),  # Optional filter by document_id
):
    # Start the base query for Model Output Accuracy by Document
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
        ).filter(
            Extraction.confidence.isnot(None)
        )  # Optional: to avoid null confidence
    )

    # Apply filters if provided
    if filename:
        accuracy_query = accuracy_query.filter(
            Extraction.filename.ilike(f"%{filename}%")
        )
    if document_id:
        accuracy_query = accuracy_query.filter(
            Extraction.document_id.ilike(f"%{document_id}%")
        )

    # Group by the necessary fields for the accuracy query
    accuracy_query = accuracy_query.group_by(
        Extraction.filename, Extraction.document_id
    )

    # Query: Overall STP Rate
    stp_subquery = (
        select(
            Extraction.filename,
            Extraction.document_id,
            func.sum(cast(Extraction.is_correct, Integer)).label("correct_count"),
            func.count(Extraction.field_id).label("total_count"),
        ).filter(
            Extraction.confidence.isnot(None)
        )  # Optional: to avoid null confidence
    )

    # Apply filters to subquery
    if filename:
        stp_subquery = stp_subquery.filter(Extraction.filename.ilike(f"%{filename}%"))
    if document_id:
        stp_subquery = stp_subquery.filter(
            Extraction.document_id.ilike(f"%{document_id}%")
        )

    stp_subquery = stp_subquery.group_by(
        Extraction.filename, Extraction.document_id
    ).subquery()

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

    # Format results for accuracy
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
