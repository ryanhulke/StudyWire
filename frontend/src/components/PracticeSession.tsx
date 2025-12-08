// src/components/PracticeSession.tsx

import React, { useState } from 'react';
import type { PracticeCard } from '../api';

type Grade = 'again' | 'hard' | 'good' | 'easy';

interface PracticeSessionProps {
  cards: PracticeCard[];
  deckName: string;
  onDone: () => void;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  cards,
  deckName,
  onDone,
}) => {
  const [queue, setQueue] = useState<PracticeCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [seen, setSeen] = useState(0);

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-2">Practice finished</h2>
        <p className="mb-4 text-gray-600">
          You went through {seen} card{seen === 1 ? '' : 's'} in {deckName}.
        </p>
        <button
          onClick={onDone}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Back
        </button>
      </div>
    );
  }

  const card = queue[index];

  const handleShowAnswer = () => setShowBack(true);

  const handleGrade = (grade: Grade) => {
    setSeen((s) => s + 1);

    setQueue((prev) => {
      const current = prev[index];

      let nextQueue = [...prev];
      // Remove current from its position
      nextQueue.splice(index, 1);

      if (grade === 'again') {
        // Put it at the end of the queue to see it again this session
        nextQueue.push(current);
      }
      // hard/good/easy just drop it from this session

      return nextQueue;
    });

    setShowBack(false);
    setIndex((prevIdx) => {
      // Stay at same index because we removed the current card
      if (index >= queue.length - 1) {
        return 0;
      }
      return prevIdx;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 bg-slate-900 text-white text-sm rounded-t-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Practice - {deckName}</span>
          <span className="text-xs text-slate-300">
            This mode does not change your spaced repetition schedule.
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-b-lg">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-6">
          <div className="text-sm text-gray-500 mb-2">
            Card {seen + 1} of {seen + queue.length}
          </div>
          <div className="min-h-[120px] mb-6">
            <div className="text-lg font-medium mb-2">Front</div>
            <div className="whitespace-pre-wrap">{card.front}</div>

            {showBack && (
              <>
                <div className="mt-6 text-lg font-medium mb-2">Back</div>
                <div className="whitespace-pre-wrap">{card.back}</div>
              </>
            )}
          </div>

          {!showBack ? (
            <button
              onClick={handleShowAnswer}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Show answer
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleGrade('again')}
                className="px-3 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 text-sm"
              >
                Again
              </button>
              <button
                onClick={() => handleGrade('hard')}
                className="px-3 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 text-sm"
              >
                Hard
              </button>
              <button
                onClick={() => handleGrade('good')}
                className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm"
              >
                Good
              </button>
              <button
                onClick={() => handleGrade('easy')}
                className="px-3 py-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 text-sm"
              >
                Easy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
