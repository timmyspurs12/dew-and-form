import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  note?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  eyebrow,
  title,
  description,
  note,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-editorial border border-stone-border bg-surface p-7 sm:p-10",
        className
      )}
    >
      {eyebrow && <p className="eyebrow-label text-sage-botanical">{eyebrow}</p>}
      <h3 className="mt-2 font-serif text-display-sm font-normal text-ink">
        {title}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
        {description}
      </p>
      {note && (
        <p className="mt-3 max-w-2xl border-l-2 border-stone-strong pl-3.5 text-xs leading-relaxed text-ink-secondary">
          {note}
        </p>
      )}
      {children && <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
