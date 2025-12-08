// src/views/ReviewView.tsx
import React, { useEffect, useState } from "react";
import { getReviewSummary, getNextReviewCard, answerReview } from "../api";
import type { ReviewCard } from "../types";
import { RenderMath } from "../components/RenderMath";

const ratingLabels: { label: string; value: number; className?: string }[] = [
  { label: "Again", value: 1, className: "danger" },
  { label: "Hard", value: 2 },
  { label: "Good", value: 3, className: "primary" },
  { label: "Easy", value: 4 }
];

export const ReviewView: React.FC = () => {
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [currentCard, setCurrentCard] = useState<ReviewCard | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshSummary() {
    try {
      const summary = await getReviewSummary();
      setDueCount(summary.due_count);
    } catch (e) {
      setError(`Failed to load summary: ${(e as Error).message}`);
    }
  }

  async function loadNextCard() {
    setLoadingCard(true);
    setError(null);
    setShowBack(false);
    try {
      const card = await getNextReviewCard();
      setCurrentCard(card);
      await refreshSummary();
    } catch (e) {
      setError(`Failed to load next card: ${(e as Error).message}`);
    } finally {
      setLoadingCard(false);
    }
  }

  async function handleAnswer(rating: number) {
    if (!currentCard) return;
    setError(null);
    try {
      await answerReview(currentCard.card_id, rating, 0);
      await loadNextCard();
    } catch (e) {
      setError(`Failed to submit review: ${(e as Error).message}`);
    }
  }

  useEffect(() => {
    refreshSummary().catch(() => undefined);
  }, []);

  return (
    <div className="card">
      <h2>Today</h2>
      <p style={{ color: "#cbd5e1" }}>
        Due cards:{" "}
        <strong>{dueCount !== null ? dueCount : "loading..."}</strong>
      </p>
      <div className="button-row" style={{ marginBottom: "0.75rem" }}>
        <button
          className="button primary"
          onClick={loadNextCard}
          disabled={loadingCard}
        >
          {currentCard ? "Next card" : "Start review"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>
      )}

      {loadingCard && <p>Loading card...</p>}

      {!loadingCard && !currentCard && dueCount === 0 && (
        <p style={{ color: "#cbd5e1" }}>
          Nothing due right now. You are done for today.
        </p>
      )}

      {!loadingCard && !currentCard && dueCount !== null && dueCount > 0 && (
        <p style={{ color: "#cbd5e1" }}>Click “Start review” to begin.</p>
      )}

      {currentCard && (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "0.5rem",
              padding: "1rem",
              backgroundColor: "#0f172a"
            }}
          >
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="badge">
                Deck {currentCard.deck_id} · Card {currentCard.card_id}
              </div>
            </div>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Front</h3>
              <RenderMath text={currentCard.front} />
            </div>
            {showBack && (
              <div style={{ marginTop: "0.75rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Back</h3>
                <RenderMath text={currentCard.back} />
              </div>
            )}
          </div>

          {!showBack ? (
            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              <button
                className="button primary"
                onClick={() => setShowBack(true)}
              >
                Show answer
              </button>
            </div>
          ) : (
            <div className="button-row" style={{ marginTop: "0.75rem" }}>
              {ratingLabels.map((r) => (
                <button
                  key={r.value}
                  className={
                    "button small" + (r.className ? " " + r.className : "")
                  }
                  onClick={() => handleAnswer(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
