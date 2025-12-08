import React, { useEffect, useState } from "react";
import { fetchPracticeCards, listDecks } from "../api";
import type { Deck, PracticeCard, PracticePool } from "../types";
import { PracticeSession } from "../components/PracticeSession";

export const PracticeView: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [pool, setPool] = useState<PracticePool>("due_recent");
  const [cards, setCards] = useState<PracticeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDecks() {
      try {
        const allDecks = await listDecks();
        setDecks(allDecks);
        if (allDecks.length > 0) {
          setSelectedDeckId(allDecks[0].id);
        }
      } catch (e) {
        setError(`Failed to load decks: ${(e as Error).message}`);
      }
    }

    loadDecks().catch(() => undefined);
  }, []);

  async function startPractice() {
    if (selectedDeckId == null) {
      setError("Select a deck to practice.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const practiceCards = await fetchPracticeCards({
        deckId: selectedDeckId,
        pool
      });
      if (!practiceCards.length) {
        setError("No cards available for this practice selection.");
        return;
      }
      setCards(practiceCards);
    } catch (e) {
      setError(`Failed to load practice cards: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function resetSession() {
    setCards(null);
  }

  if (cards) {
    const deckName = decks.find((d) => d.id === selectedDeckId)?.name ?? "Deck";
    return <PracticeSession cards={cards} deckName={deckName} onDone={resetSession} />;
  }

  return (
    <div className="card">
      <h2>Practice</h2>
      <p style={{ color: "#cbd5e1", fontSize: "0.95rem" }}>
        Practice mode lets you drill cards without affecting your spaced repetition
        schedule.
      </p>

      <div className="split-layout" style={{ gap: "1.25rem", marginTop: "0.5rem" }}>
        <div>
          <label style={{ fontSize: "0.9rem", display: "block" }}>Deck</label>
          <select
            className="select"
            value={selectedDeckId ?? ""}
            onChange={(e) =>
              setSelectedDeckId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Select a deck</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.9rem", display: "block" }}>
            Card pool
          </label>
          <select
            className="select"
            value={pool}
            onChange={(e) => setPool(e.target.value as PracticePool)}
          >
            <option value="due_recent">Due + recent</option>
            <option value="all">All cards in deck</option>
            <option value="new_only">Only new cards</option>
          </select>
        </div>
      </div>

      <div className="button-row" style={{ marginTop: "1rem" }}>
        <button
          className="button primary"
          onClick={startPractice}
          disabled={loading || selectedDeckId == null}
        >
          {loading ? "Loading..." : "Start practice"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#fca5a5", fontSize: "0.9rem", marginTop: "0.75rem" }}>
          {error}
        </p>
      )}

      {!decks.length && !error && (
        <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: "0.75rem" }}>
          No decks available yet. Create one in the Cards tab to start practicing.
        </p>
      )}
    </div>
  );
};
