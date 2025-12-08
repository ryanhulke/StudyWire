from datetime import date, datetime, timedelta

from .models import Card, SchedulingState

def initialize_scheduling_state(card: Card) -> SchedulingState:
    """
    Create an initial scheduling state for a new card.
    New cards are due today, with interval=0, ease_factor=2.5.
    """
    today = date.today()
    return SchedulingState(
        card_id=card.id,
        due=today,
        interval=0,
        ease_factor=2.5,
        repetitions=0,
        lapses=0,
    )


def update_schedule_for_review(
    state: SchedulingState,
    quality: int,
    review_time: datetime,
    min_ease: float = 1.3,
) -> None:
    """
    Update the scheduling state given a review quality (1-4).
    1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
    This is a standard SM-2-style update, simplified.
    """
    if quality < 1 or quality > 4:
        raise ValueError("quality must be between 1 and 4")

    # Adjust ease factor
    ef = state.ease_factor
    q = quality
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if ef < min_ease:
        ef = min_ease
    state.ease_factor = ef

    if quality < 3:
        # Again / Hard: reset repetitions, small interval
        state.repetitions = 0
        state.lapses += 1
        state.interval = 1
    else:
        # Good / Easy
        state.repetitions += 1
        if state.repetitions == 1:
            state.interval = 1
        elif state.repetitions == 2:
            state.interval = 6
        else:
            # Increase interval by ease factor
            state.interval = int(round(state.interval * state.ease_factor))

    state.due = review_time.date() + timedelta(days=state.interval)
