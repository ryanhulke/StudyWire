// src/components/Collapse.tsx
import React, {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

interface CollapseProps {
  isOpen: boolean;
  children: ReactNode;
  durationMs?: number;
  onRest?: (isOpen: boolean) => void;
}

export const Collapse: React.FC<CollapseProps> = ({
  isOpen,
  children,
  durationMs = 200,
  onRest
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // Whether we keep the children mounted at all
  const [shouldRender, setShouldRender] = useState(isOpen);

  const isFirstRender = useRef(true);
  const prevIsOpen = useRef(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  // Main open / close transitions
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.overflow = "hidden";
    el.style.transitionProperty = "height, opacity";
    el.style.transitionTimingFunction = "ease";
    el.style.transitionDuration = `${durationMs}ms`;

    if (isFirstRender.current) {
      isFirstRender.current = false;

      if (isOpen) {
        setShouldRender(true);
        el.style.height = "auto";
        el.style.opacity = "1";
      } else {
        setShouldRender(false);
        el.style.height = "0px";
        el.style.opacity = "0";
      }

      prevIsOpen.current = isOpen;
      setIsAnimating(false);
      return;
    }

    const wasOpen = prevIsOpen.current;
    prevIsOpen.current = isOpen;

    if (isOpen && !wasOpen) {
      setShouldRender(true);

      requestAnimationFrame(() => {
        if (!ref.current) return;
        const node = ref.current;

        const full = node.scrollHeight;

        // Start from collapsed state
        node.style.height = "0px";
        node.style.opacity = "0";

        // Force reflow so the browser acknowledges the starting height
        void node.offsetHeight;

        setIsAnimating(true);
        node.style.height = `${full}px`;
        node.style.opacity = "1";
      });
      return;
    }

    // CLOSING
    if (!isOpen && wasOpen && shouldRender) {
      const full = el.scrollHeight;

      // Start from the current full height
      el.style.height = `${full}px`;
      el.style.opacity = "1";

      // Force reflow
      void el.offsetHeight;

      setIsAnimating(true);
      el.style.height = "0px";
      el.style.opacity = "0";
      return;
    }
  }, [isOpen, durationMs, shouldRender]);

  // While opening: if the content grows (e.g. chunks load),
  // bump the target height so the animation keeps going smoothly
  useLayoutEffect(() => {
    if (!isOpen || !shouldRender || !isAnimating) return;
    const el = ref.current;
    if (!el) return;

    const full = el.scrollHeight;
    el.style.height = `${full}px`;
  }, [children, isOpen, shouldRender, isAnimating]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    if (e.target !== ref.current) return;
    if (e.propertyName !== "height") return;

    setIsAnimating(false);

    if (isOpen) {
      // Fully open: let height be auto for natural resizing
      ref.current.style.height = "auto";
    } else {
      // Fully closed: now safe to unmount children
      setShouldRender(false);
    }

    if (onRest) {
      onRest(isOpen);
    }
  };

  return (
    <div ref={ref} onTransitionEnd={handleTransitionEnd}>
      {shouldRender ? children : null}
    </div>
  );
};
