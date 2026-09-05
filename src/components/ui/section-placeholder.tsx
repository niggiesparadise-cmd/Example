import { Card, EmptyState } from "@heroui/react";
import type { ReactNode } from "react";

interface SectionPlaceholderProps {
  title: string;
  description: string;
  icon: ReactNode;
  /** What this section will hold once it is built. */
  planned: string[];
}

/**
 * The stand-in for a section that is routed and navigable but not yet built.
 *
 * Every section exists in the router from day one so navigation, the active
 * state and deep links all work while the pages are filled in one at a time.
 */
export function SectionPlaceholder({ description, icon, planned, title }: SectionPlaceholderProps) {
  return (
    <Card className="border border-border p-8">
      <EmptyState className="mx-auto max-w-md text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-surface-secondary text-muted"
        >
          {icon}
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
        <ul className="mt-5 flex flex-col gap-1.5 text-left text-sm text-muted">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
              {item}
            </li>
          ))}
        </ul>
      </EmptyState>
    </Card>
  );
}
