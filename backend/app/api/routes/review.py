from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...db import get_session
from ...models import Card, ReviewLog, SchedulingState
from ...schemas import ReviewAnswerRequest, ReviewCard, ReviewSummary
from ...srs import initialize_scheduling_state, update_schedule_for_review

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/summary", response_model=ReviewSummary)
def review_summary(
    session: Session = Depends(get_session),
) -> ReviewSummary:
    today = date.today()
    stmt = select(SchedulingState).where(SchedulingState.due <= today)
    due_states = session.exec(stmt).all()
    return ReviewSummary(due_count=len(due_states))


@router.get("/next", response_model=ReviewCard)
def get_next_review_card(
    session: Session = Depends(get_session),
) -> ReviewCard:
    today = date.today()
    stmt = (
        select(SchedulingState, Card)
        .join(Card, Card.id == SchedulingState.card_id)
        .where(SchedulingState.due <= today)
        .order_by(SchedulingState.due, Card.id)
    )

    row = session.exec(stmt).first()
    if row is None:
        raise HTTPException(status_code=404, detail="No due cards")

    state, card = row

    return ReviewCard(
        card_id=card.id,
        deck_id=card.deck_id,
        front=card.front,
        back=card.back,
        source_id=card.source_id,
        source_chunk_id=card.source_chunk_id,
        due=state.due,
        interval=state.interval,
        ease_factor=state.ease_factor,
        repetitions=state.repetitions,
        lapses=state.lapses,
    )


@router.post("/answer")
def answer_review(
    req: ReviewAnswerRequest,
    session: Session = Depends(get_session),
) -> dict:
    card = session.get(Card, req.card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    stmt = select(SchedulingState).where(SchedulingState.card_id == card.id)
    state = session.exec(stmt).first()
    if state is None:
        state = initialize_scheduling_state(card)
        session.add(state)
        session.commit()
        session.refresh(state)

    review = ReviewLog(
        card_id=card.id,
        rating=req.rating,
        duration_ms=req.duration_ms,
        timestamp=datetime.utcnow(),
    )
    session.add(review)

    try:
        update_schedule_for_review(state, req.rating, datetime.utcnow())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    session.add(state)
    session.commit()

    return {
        "status": "ok",
        "card_id": card.id,
        "next_due": state.due.isoformat(),
        "interval": state.interval,
        "ease_factor": state.ease_factor,
        "repetitions": state.repetitions,
        "lapses": state.lapses,
    }
