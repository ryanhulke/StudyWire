from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...db import get_session
from ...models import Card, Deck, ReviewLog, SchedulingState
from ...schemas import (
    BulkCreateCardsRequest,
    CardCreate,
    CardRead,
    CardUpdate,
)
from ...srs import initialize_scheduling_state

router = APIRouter(prefix="/api", tags=["cards"])


def _tags_list_to_str(tags: List[str]) -> str:
    cleaned = [t.strip() for t in tags if t.strip()]
    return ",".join(cleaned)


def _tags_str_to_list(tags: str) -> List[str]:
    if not tags:
        return []
    return [t for t in (x.strip() for x in tags.split(",")) if t]


@router.get("/cards", response_model=List[CardRead])
def list_cards(
    deck_id: Optional[int] = None,
    source_id: Optional[int] = None,
    session: Session = Depends(get_session),
) -> List[CardRead]:
    statement = select(Card)
    if deck_id is not None:
        statement = statement.where(Card.deck_id == deck_id)
    if source_id is not None:
        statement = statement.where(Card.source_id == source_id)
    statement = statement.order_by(Card.id)

    cards = session.exec(statement).all()
    result: List[CardRead] = []
    for c in cards:
        result.append(
            CardRead(
                id=c.id,
                deck_id=c.deck_id,
                front=c.front,
                back=c.back,
                card_type=c.card_type,
                tags=_tags_str_to_list(c.tags),
                source_id=c.source_id,
                source_chunk_id=c.source_chunk_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return result


@router.post("/cards", response_model=CardRead)
def create_card(
    card_in: CardCreate,
    session: Session = Depends(get_session),
) -> CardRead:
    deck = session.get(Deck, card_in.deck_id)
    if deck is None:
        raise HTTPException(status_code=400, detail="Deck not found")

    card = Card(
        deck_id=card_in.deck_id,
        front=card_in.front,
        back=card_in.back,
        card_type=card_in.card_type,
        tags=_tags_list_to_str(card_in.tags),
        source_id=card_in.source_id,
        source_chunk_id=card_in.source_chunk_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(card)
    session.commit()
    session.refresh(card)

    sched = initialize_scheduling_state(card)
    session.add(sched)
    session.commit()

    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        front=card.front,
        back=card.back,
        card_type=card.card_type,
        tags=_tags_str_to_list(card.tags),
        source_id=card.source_id,
        source_chunk_id=card.source_chunk_id,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.post("/cards/bulk_create", response_model=List[CardRead])
def bulk_create_cards(
    req: BulkCreateCardsRequest,
    session: Session = Depends(get_session),
) -> List[CardRead]:
    deck = session.get(Deck, req.deck_id)
    if deck is None:
        raise HTTPException(status_code=400, detail="Deck not found")

    created_cards: List[Card] = []

    for item in req.cards:
        card = Card(
            deck_id=req.deck_id,
            front=item.front,
            back=item.back,
            card_type=item.card_type,
            tags=_tags_list_to_str(item.tags),
            source_id=item.source_id,
            source_chunk_id=item.source_chunk_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(card)
        session.commit()
        session.refresh(card)

        sched = initialize_scheduling_state(card)
        session.add(sched)
        session.commit()

        created_cards.append(card)

    result: List[CardRead] = []
    for c in created_cards:
        result.append(
            CardRead(
                id=c.id,
                deck_id=c.deck_id,
                front=c.front,
                back=c.back,
                card_type=c.card_type,
                tags=_tags_str_to_list(c.tags),
                source_id=c.source_id,
                source_chunk_id=c.source_chunk_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return result


@router.put("/cards/{card_id}", response_model=CardRead)
def update_card(
    card_id: int,
    card_upd: CardUpdate,
    session: Session = Depends(get_session),
) -> CardRead:
    card = session.get(Card, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    if card_upd.front is not None:
        card.front = card_upd.front
    if card_upd.back is not None:
        card.back = card_upd.back
    if card_upd.card_type is not None:
        card.card_type = card_upd.card_type
    if card_upd.tags is not None:
        card.tags = _tags_list_to_str(card_upd.tags)
    if card_upd.deck_id is not None:
        deck = session.get(Deck, card_upd.deck_id)
        if deck is None:
            raise HTTPException(status_code=400, detail="Deck not found")
        card.deck_id = card_upd.deck_id

    card.updated_at = datetime.utcnow()
    session.add(card)
    session.commit()
    session.refresh(card)

    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        front=card.front,
        back=card.back,
        card_type=card.card_type,
        tags=_tags_str_to_list(card.tags),
        source_id=card.source_id,
        source_chunk_id=card.source_chunk_id,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    session: Session = Depends(get_session),
) -> dict:
    card = session.get(Card, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    # Delete scheduling state
    stmt = select(SchedulingState).where(SchedulingState.card_id == card.id)
    sched = session.exec(stmt).first()
    if sched is not None:
        session.delete(sched)

    # Delete review logs
    rev_stmt = select(ReviewLog).where(ReviewLog.card_id == card.id)
    revs = session.exec(rev_stmt).all()
    for r in revs:
        session.delete(r)

    session.delete(card)
    session.commit()
    return {"status": "deleted"}
