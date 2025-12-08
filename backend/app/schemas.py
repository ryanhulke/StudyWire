from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class SourceRead(BaseModel):
    id: int
    path: str
    title: str
    type: str

    class Config:
        orm_mode = True


class SourceChunkRead(BaseModel):
    id: int
    kind: str
    loc: str
    text: str

    class Config:
        orm_mode = True


class DeckRead(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        orm_mode = True


class DeckCreate(BaseModel):
    name: str
    description: str = ""


class CardRead(BaseModel):
    id: int
    deck_id: int
    front: str
    back: str
    card_type: str
    tags: List[str]
    source_id: Optional[int]
    source_chunk_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class CardCreate(BaseModel):
    deck_id: int
    front: str
    back: str
    card_type: str = "basic"
    tags: List[str] = []
    source_id: Optional[int] = None
    source_chunk_id: Optional[int] = None


class CardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    card_type: Optional[str] = None
    tags: Optional[List[str]] = None
    deck_id: Optional[int] = None


class BulkCardCreateItem(BaseModel):
    front: str
    back: str
    card_type: str = "basic"
    tags: List[str] = []
    source_id: Optional[int] = None
    source_chunk_id: Optional[int] = None


class BulkCreateCardsRequest(BaseModel):
    deck_id: int
    cards: List[BulkCardCreateItem]


class ReviewCard(BaseModel):
    card_id: int
    deck_id: int
    front: str
    back: str
    source_id: Optional[int]
    source_chunk_id: Optional[int]
    due: date
    interval: int
    ease_factor: float
    repetitions: int
    lapses: int


class ReviewAnswerRequest(BaseModel):
    card_id: int
    rating: int  # 1-4
    duration_ms: int = 0


class ReviewSummary(BaseModel):
    due_count: int


class GenerateCardsRequest(BaseModel):
    source_id: int
    chunk_ids: Optional[List[int]] = None
    num_cards: int = 10
    temperature: float = 0.7


class GeneratedCard(BaseModel):
    front: str
    back: str


class GenerateCardsResponse(BaseModel):
    cards: List[GeneratedCard]
