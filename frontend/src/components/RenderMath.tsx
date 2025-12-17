// src/components/RenderMath.tsx
import React, { useEffect, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

interface RenderMathProps {
  text: string;
  className?: string;
}

export const RenderMath: React.FC<RenderMathProps> = ({ text, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    renderMathInElement(ref.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      throwOnError: false
    });
  }, [text]);

  return (
    <div
      ref={ref}
      className={className}
      // preserve line breaks
      dangerouslySetInnerHTML={{
        __html: text.replace(/\n/g, "<br/>")
      }}
    />
  );
};
