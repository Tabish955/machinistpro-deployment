
import { useEffect, useRef, useCallback } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const visible = useRef(false);
  const hovering = useRef(false);
  const clicking = useRef(false);
  const rafId = useRef<number>(0);

  const animate = useCallback(() => {
    // Smooth follow for ring
    ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.15;
    ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.15;

    if (dotRef.current) {
      dotRef.current.style.left = `${pos.current.x}px`;
      dotRef.current.style.top = `${pos.current.y}px`;
      dotRef.current.style.opacity = visible.current ? "1" : "0";
    }

    if (ringRef.current) {
      ringRef.current.style.left = `${ringPos.current.x}px`;
      ringRef.current.style.top = `${ringPos.current.y}px`;
      ringRef.current.style.opacity = visible.current ? "1" : "0";
    }

    rafId.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // Only enable on non-touch devices
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) visible.current = true;
    };

    const handleEnter = () => { visible.current = true; };
    const handleLeave = () => { visible.current = false; };

    const handleDown = () => {
      clicking.current = true;
      ringRef.current?.classList.add("clicking");
      ringRef.current?.classList.remove("hover");
    };

    const handleUp = () => {
      clicking.current = false;
      ringRef.current?.classList.remove("clicking");
    };

    const handleHoverIn = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.tagName === "BUTTON" ||
        target.tagName === "A"
      ) {
        hovering.current = true;
        ringRef.current?.classList.add("hover");
      }
    };

    const handleHoverOut = () => {
      hovering.current = false;
      ringRef.current?.classList.remove("hover");
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseenter", handleEnter);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("mouseover", handleHoverIn);
    document.addEventListener("mouseout", handleHoverOut);

    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseenter", handleEnter);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("mouseover", handleHoverIn);
      document.removeEventListener("mouseout", handleHoverOut);
      cancelAnimationFrame(rafId.current);
    };
  }, [animate]);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
