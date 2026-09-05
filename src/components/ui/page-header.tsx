import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional line above the title — the date, a term label, a breadcrumb. */
  eyebrow?: ReactNode;
  /** Buttons or filters aligned to the right on wide screens. */
  actions?: ReactNode;
}

/** The heading block every page opens with. */
export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="font-display text-2xl leading-tight font-semibold text-balance text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
