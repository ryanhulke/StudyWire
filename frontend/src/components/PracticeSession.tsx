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

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  cards,
  deckName,
  onDone
}) => {
  const [queue, setQueue] = useState<PracticeCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [seen, setSeen] = useState(0);

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

  const card = queue[index];

  const handleShowAnswer = () => setShowBack(true);

  const handleGrade = (grade: Grade) => {
    setSeen((s) => s + 1);

    setQueue((prev) => {
      const next = [...prev];
      const current = next[index];
      next.splice(index, 1); // remove current

      if (grade === "again") {
        // see it again later this session
        next.push(current);
      }

      return next;
    });

    setShowBack(false);
    setIndex((prevIdx) => {
      if (index >= queue.length - 1) {
        return 0;
      }
      return prevIdx;
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
          border: "1px solid #1f2937",
          borderRadius: "0.5rem",
          padding: "1rem",
          backgroundColor: "#0f172a",
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

      {!showBack ? (
        <div className="button-row" style={{ marginTop: "0.75rem" }}>
          <button className="button primary" onClick={handleShowAnswer}>
            Show answer
          </button>
        </div>
      ) : (
        <div className="button-row" style={{ marginTop: "0.75rem" }}>
          <button
            className="button small danger"
            onClick={() => handleGrade("again")}
          >
            Again
          </button>
          <button
            className="button small"
            onClick={() => handleGrade("hard")}
          >
            Hard
          </button>
          <button
            className="button small primary"
            onClick={() => handleGrade("good")}
          >
            Good
          </button>
          <button
            className="button small"
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
