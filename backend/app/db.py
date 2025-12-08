from typing import Generator

from sqlmodel import SQLModel, Session, create_engine

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, echo=False, connect_args={"check_same_thread": False}
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session."""
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """
    Initialize the database.

    Import models inside the function to ensure all tables are registered
    before calling create_all.
    """
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
