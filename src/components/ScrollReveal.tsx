"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Progressive-enhancement scroll reveal:
 * - Renders immediately visible (`opacity: 1`) on SSR, reduced-motion, or environments
 *   without `IntersectionObserver` (including automated JSDOM tests), never delaying access.
 * - Subtly reveals below-the-fold sections as the visitor scrolls.
 */
export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealState, setRevealState] = useState<"idle" | "pending" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof window.IntersectionObserver !== "function") {
      return;
    }

    const rect = el.getBoundingClientRect();
    const alreadyInViewport = rect.top < window.innerHeight * 0.92;
    if (alreadyInViewport) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setRevealState("pending");
    });

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealState("shown");
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.06 }
    );

    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        revealState === "pending" && "scroll-reveal-pending",
        revealState === "shown" && "scroll-reveal-shown",
        className
      )}
    >
      {children}
    </div>
  );
}
