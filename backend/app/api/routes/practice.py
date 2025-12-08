# app/api/routes/practice.py

from datetime import date, timedelta
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Card, Deck  # adjust import paths if needed

router = APIRouter(prefix="/api/practice", tags=["practice"])


class PracticePool(str, Enum):
    DUE_RECENT = "due_recent"
    ALL = "all"
    NEW_ONLY = "new_only"


class PracticeCardOut(Card.model_validate.__func__.__annotations__.get("return", Card)):  # type: ignore
    """
    Simple passthrough schema. If you already have a CardOut Pydantic model,
    use that instead and delete this class.
    """
    pass


@router.get("/cards", response_model=List[PracticeCardOut])
def get_practice_cards(
    deck_id: int = Query(..., description="Deck to practice"),
    pool: PracticePool = Query(
        PracticePool.DUE_RECENT,
        description="Which card pool to draw practice cards from",
    ),
    limit: Optional[int] = Query(
        None, ge=1, le=500, description="If omitted, return all matching cards"
    ),
    session: Session = Depends(get_session),
):
    """
    Returns a list of cards for practice.

    - Does NOT modify any scheduling data.
    - The frontend is responsible for local session logic (Again/Good/etc).
    """

    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    today = date.today()

    stmt = select(Card).where(Card.deck_id == deck_id)

    # The following assumes your Card model has fields:
    # - due (date)
    # - interval (int)
    # - repetitions (int)
    # If your review state lives in a separate table, adapt the joins accordingly.
    if pool == PracticePool.DUE_RECENT:
        # Due cards plus some that were recently seen
        try:
            from app.models import CardReviewState  # if you have a separate table
            # Example if you keep review state separate - adjust if not:
            rs_stmt = (
                select(Card)
                .join(CardReviewState, CardReviewState.card_id == Card.id)
                .where(
                    Card.deck_id == deck_id,
                    (
                        (CardReviewState.due <= today)
                        | (
                            CardReviewState.due > today,
                            CardReviewState.due <= today + timedelta(days=3),
                        )
                    ),
                )
            )
            stmt = rs_stmt
        except ImportError:
            # Fallback if scheduling fields live directly on Card
            stmt = stmt.where(
                (Card.due <= today)
                | (Card.due <= today + timedelta(days=3))
            ).order_by(Card.due)
    elif pool == PracticePool.NEW_ONLY:
        # Cards never successfully reviewed
        stmt = stmt.where(
            getattr(Card, "repetitions", 0) == 0  # adapt if needed
        )
    # else pool == ALL: no extra filter

    # This gets a bunch of candidates then we trim
    cards = session.exec(stmt).all()

    # Trim and randomize a bit
    if limit is not None and len(cards) > limit:
        import random

        random.shuffle(cards)
        cards = cards[:limit]

    return cards
