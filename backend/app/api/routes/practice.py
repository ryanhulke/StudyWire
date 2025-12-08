# app/api/routes/practice.py

from datetime import date, timedelta
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from sqlalchemy import and_, or_

from app.db import get_session
from app.models import Card, Deck, SchedulingState

router = APIRouter(prefix="/api", tags=["practice"])


class PracticePool(str, Enum):
    DUE_RECENT = "due_recent"
    ALL = "all"
    NEW_ONLY = "new_only"


@router.get("/practice_cards", response_model=list[Card])
def get_practice_cards(
    deck_id: int = Query(...),
    pool: PracticePool = Query(PracticePool.DUE_RECENT),
    session: Session = Depends(get_session),
):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    today = date.today()

    # Decide query based on pool
    if pool == PracticePool.DUE_RECENT:
        # Cards that are due now or within the next 3 days
        stmt = (
            select(Card)
            .join(SchedulingState, SchedulingState.card_id == Card.id)
            .where(
                Card.deck_id == deck_id,
                or_(
                    SchedulingState.due <= today,
                    and_(
                        SchedulingState.due > today,
                        SchedulingState.due <= today + timedelta(days=3),
                    ),
                ),
            )
            .order_by(SchedulingState.due)
        )

    elif pool == PracticePool.NEW_ONLY:
        # Cards with repetitions == 0
        stmt = (
            select(Card)
            .join(SchedulingState, SchedulingState.card_id == Card.id)
            .where(
                Card.deck_id == deck_id,
                SchedulingState.repetitions == 0,
            )
        )

    else:  # PracticePool.ALL
        # All cards in deck, regardless of scheduling info
        stmt = select(Card).where(Card.deck_id == deck_id)

    cards = session.exec(stmt).all()
    return cards
