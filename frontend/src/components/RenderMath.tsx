import React from "react";

interface RenderMathProps {
  text: string;
  className?: string;
}

/**
 * RenderMath: renders plain text with LaTeX fragments like
 * \( ... \), \[ ... \], $...$, $$...$$ using KaTeX auto-render.
 */
export const RenderMath: React.FC<RenderMathProps> = ({ text, className }) => {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {line}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
};
