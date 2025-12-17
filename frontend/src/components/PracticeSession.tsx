// src/components/PracticeSession.tsx

import React, { useState } from "react";
import type { PracticeCard } from "../types";
import { RenderMath } from "./RenderMath";

type Grade = "again" | "hard" | "good" | "easy";

interface PracticeSessionProps {
  cards: PracticeCard[];
  deckName: string;
  onDone: () => void;
}

interface HistoryEntry {
  card: PracticeCard;
  addedAgain: boolean;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  cards,
  deckName,
  onDone
}) => {
  const [queue, setQueue] = useState<PracticeCard[]>(cards);
  const [showBack, setShowBack] = useState(false);
  const [seen, setSeen] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  if (queue.length === 0) {
    return (
      <div className="card">
        <h2>Practice finished</h2>
        <p>
          You went through <strong>{seen}</strong> card
          {seen === 1 ? "" : "s"} in <strong>{deckName}</strong>.
        </p>
        <div className="button-row" style={{ marginTop: "0.75rem" }}>
          <button className="button" onClick={onDone}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const card = queue[0];

  const handleFlipCard = () => setShowBack((prev) => !prev);

  const handleGrade = (grade: Grade) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue;
      const current = prevQueue[0];
      setHistory((prevHistory) => [
        ...prevHistory,
        { card: current, addedAgain: grade === "again" }
      ]);

      setSeen((s) => s + 1);
      setShowBack(false);

      const nextQueue = prevQueue.slice(1);
    

      if (grade === "again") {
        // see it again later this session
        nextQueue.push(current);
      }

      return nextQueue;
    });
  };
  const handlePreviousCard = () => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;

      const previousEntry = prevHistory[prevHistory.length - 1];

      setQueue((prevQueue) => {
        let nextQueue = [...prevQueue];

        if (previousEntry.addedAgain) {
          const againIndex = nextQueue.findIndex(
            (queuedCard) => queuedCard.id === previousEntry.card.id
          );

          if (againIndex !== -1) {
            nextQueue.splice(againIndex, 1);
          }
        }

        return [previousEntry.card, ...nextQueue];
      });

      setSeen((s) => Math.max(0, s - 1));
      setShowBack(false);

      return prevHistory.slice(0, -1);
    });
  };

  return (
    <div className="card">
      <h2>Practice - {deckName}</h2>
      <p style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
        Practice mode does <strong>not</strong> change your spaced repetition
        schedule.
      </p>

      <div
        style={{
          border: "1px solid #3b3b3bff",
          borderRadius: "0.5rem",
          padding: "1rem",
          backgroundColor: "#404040ff",
          marginTop: "0.75rem"
        }}
      >
        <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }}>
          Card {seen + 1} of {seen + queue.length}
        </div>

        <div>
          <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Front</h3>
          <RenderMath text={card.front} />
        </div>

        {showBack && (
          <div style={{ marginTop: "0.75rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Back</h3>
            <RenderMath text={card.back} />
          </div>
        )}
      </div>

      <div className="button-row" style={{ marginTop: "0.75rem" }}>
        <button
          className="button"
          disabled={history.length === 0}
          onClick={handlePreviousCard}
        >
          Previous card
        </button>
        <button
          className={`button ${showBack ? "" : "primary"}`}
          onClick={handleFlipCard}
        >
          {showBack ? "Hide answer" : "Show answer"}
        </button>
      </div>

      {showBack && (
        <div className="button-row" style={{ marginTop: "0.75rem" }}>
          <button
            className="button small missed"
            onClick={() => handleGrade("again")}
          >
            Miss
          </button>
          <button
            className="button small hard"
            onClick={() => handleGrade("hard")}
          >
            Hard
          </button>
          <button
            className="button small good"
            onClick={() => handleGrade("good")}
          >
            Good
          </button>
          <button
            className="button small easy"
            onClick={() => handleGrade("easy")}
          >
            Easy
          </button>
        </div>
      )}

      <div className="button-row" style={{ marginTop: "0.75rem" }}>
        <button className="button" onClick={onDone}>
          End practice
        </button>
      </div>
    </div>
  );
};
