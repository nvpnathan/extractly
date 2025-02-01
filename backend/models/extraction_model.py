from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    PrimaryKeyConstraint,
)
from sqlalchemy.sql import func
from database import Base
from pydantic import BaseModel


class Extraction(Base):
    __tablename__ = "extraction"

    filename = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    document_type_id = Column(Integer, nullable=False)
    field_id = Column(Integer, nullable=False)
    field = Column(String, nullable=False)
    is_missing = Column(Boolean, nullable=False)
    field_value = Column(String, nullable=True)
    field_unformatted_value = Column(String, nullable=True)
    validated_field_value = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    confidence = Column(Float, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    operator_confirmed = Column(Boolean, nullable=True)
    row_index = Column(Integer, default=-1)
    column_index = Column(Integer, default=-1)
    timestamp = Column(DateTime, default=func.now())

    # Composite Primary Key
    __table_args__ = (
        PrimaryKeyConstraint(
            "filename", "field_id", "field", "row_index", "column_index"
        ),
    )


# Define Pydantic model for the query result
class FieldStats(BaseModel):
    field_id: str
    field: str
    avg_field_accuracy: float
    avg_document_ocr_confidence: float


class DocumentStats(BaseModel):
    document_id: str
    filename: str
    avg_field_accuracy: float
    avg_ocr_accuracy: float
