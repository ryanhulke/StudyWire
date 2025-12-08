from datetime import date, datetime
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class Source(SQLModel, table=True):
    __tablename__ = "sources"

    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(index=True, unique=True)
    title: str
    type: str  # "markdown" or "pdf"
    hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Use typing.List[...] here (NOT list[...] and NOT future annotations)
    chunks: List["SourceChunk"] = Relationship(back_populates="source")
    cards: List["Card"] = Relationship(back_populates="source")


class SourceChunk(SQLModel, table=True):
    __tablename__ = "source_chunks"

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="sources.id")
    kind: str  # "markdown_section", "markdown_document", "pdf_page", etc.
    loc: str   # e.g. heading text or "page=3"
    text: str

    source: Optional[Source] = Relationship(back_populates="chunks")
    cards: List["Card"] = Relationship(back_populates="source_chunk")


class Deck(SQLModel, table=True):
    __tablename__ = "decks"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: str = ""

    cards: List["Card"] = Relationship(back_populates="deck")


class Card(SQLModel, table=True):
    __tablename__ = "cards"

    id: Optional[int] = Field(default=None, primary_key=True)
    deck_id: int = Field(foreign_key="decks.id")
    source_id: Optional[int] = Field(default=None, foreign_key="sources.id")
    source_chunk_id: Optional[int] = Field(
        default=None, foreign_key="source_chunks.id"
    )

    front: str
    back: str
    card_type: str = "basic"  # e.g. "basic", "cloze"
    tags: str = ""  # comma-separated tags

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    deck: Optional[Deck] = Relationship(back_populates="cards")
    source: Optional[Source] = Relationship(back_populates="cards")
    source_chunk: Optional[SourceChunk] = Relationship(back_populates="cards")
    scheduling_state: Optional["SchedulingState"] = Relationship(
        back_populates="card"
    )
    reviews: List["ReviewLog"] = Relationship(back_populates="card")


class SchedulingState(SQLModel, table=True):
    __tablename__ = "scheduling_states"

    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="cards.id", unique=True)

    due: date
    interval: int  # days
    ease_factor: float
    repetitions: int
    lapses: int

    card: Optional[Card] = Relationship(back_populates="scheduling_state")


class ReviewLog(SQLModel, table=True):
    __tablename__ = "review_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="cards.id")

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy
    duration_ms: int

    card: Optional[Card] = Relationship(back_populates="reviews")
