from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
)
from sqlalchemy.sql import func
from database.database import Base
from pydantic import BaseModel


class Classification(Base):
    __tablename__ = "classification"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    document_type_id = Column(String, nullable=False)
    classification_confidence = Column(Float, nullable=False)
    start_page = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=False)
    classifier_name = Column(String, nullable=False)
    operation_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now())


# Define Pydantic model for the query result
class ClassificationStats(BaseModel):
    document_id: str
    filename: str
    classifier_name: str
    classification_confidence: float
    avg_field_accuracy: float
    avg_document_ocr_confidence: float
