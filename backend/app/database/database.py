from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config.project_config import SQLITE_DB_PATH

# Ensure SQLITE_DB_PATH includes sqlite:/// if using a file
if not SQLITE_DB_PATH.startswith("sqlite:///"):
    SQLITE_DB_PATH = f"sqlite:///{SQLITE_DB_PATH}"

engine = create_engine(SQLITE_DB_PATH, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
