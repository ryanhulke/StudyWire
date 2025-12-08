import React, { useEffect, useState } from "react";
import { listDecks, listCards, deleteCard } from "../api";
import type { Deck, Card } from "../types";

export const CardsView: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const ds = await listDecks();
        setDecks(ds);
        if (ds.length > 0) {
          setSelectedDeckId(ds[0].id);
        }
      } catch (e) {
        setError(`Failed to load decks: ${(e as Error).message}`);
      }
    }
    init().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selectedDeckId == null) {
      setCards([]);
      return;
    }
    async function loadCards() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const cs = await listCards(selectedDeckId ?? undefined);
        setCards(cs);
      } catch (e) {
        setError(`Failed to load cards: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    }
    loadCards().catch(() => undefined);
  }, [selectedDeckId]);

  async function handleDelete(cardId: number) {
    setError(null);
    setMessage(null);
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setMessage(`Deleted card ${cardId}.`);
    } catch (e) {
      setError(`Failed to delete card: ${(e as Error).message}`);
    }
  }

  return (
    <div className="card">
      <h2>Cards</h2>
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.85rem" }}>
          Deck{" "}
          <select
            className="select"
            value={selectedDeckId ?? ""}
            onChange={(e) =>
              setSelectedDeckId(
                e.target.value ? Number(e.target.value) : null
              )
            }
          >
            <option value="">Select deck</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p>Loading cards...</p>}
      {error && (
        <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>
      )}
      {message && (
        <p style={{ color: "#34d399", fontSize: "0.85rem" }}>{message}</p>
      )}

      {!loading && !cards.length && selectedDeckId != null && (
        <p style={{ fontSize: "0.9rem" }}>
          This deck currently has no cards.
        </p>
      )}

      {!loading && cards.length > 0 && (
        <div className="list">
          {cards.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.6rem",
                marginBottom: "0.4rem",
                backgroundColor: "#0f172a"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.25rem"
                }}
              >
                <div style={{ fontSize: "0.8rem" }}>
                  Card {c.id} · Deck {c.deck_id}
                </div>
                <button
                  className="button small danger"
                  onClick={() => handleDelete(c.id)}
                >
                  Delete
                </button>
              </div>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                <strong>Front:</strong>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{c.front}</span>
              </div>
              <div style={{ fontSize: "0.85rem" }}>
                <strong>Back:</strong>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{c.back}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
