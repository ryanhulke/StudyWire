from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...db import get_session
from ...models import Deck
from ...schemas import DeckCreate, DeckRead

router = APIRouter(prefix="/api", tags=["decks"])


@router.get("/decks", response_model=List[DeckRead])
def list_decks(
    session: Session = Depends(get_session),
) -> List[DeckRead]:
    decks = session.exec(select(Deck).order_by(Deck.name)).all()
    return [
        DeckRead(id=d.id, name=d.name, description=d.description)
        for d in decks
    ]


@router.post("/decks", response_model=DeckRead)
def create_deck(
    deck_in: DeckCreate,
    session: Session = Depends(get_session),
) -> DeckRead:
    stmt = select(Deck).where(Deck.name == deck_in.name)
    existing = session.exec(stmt).first()
    if existing is not None:
        raise HTTPException(
            status_code=400, detail="Deck with this name already exists"
        )

    deck = Deck(name=deck_in.name, description=deck_in.description)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return DeckRead(id=deck.id, name=deck.name, description=deck.description)
