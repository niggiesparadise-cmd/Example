import { Card, cn } from "@heroui/react";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  /** A link or button aligned with the title. */
  action?: ReactNode;
  /** Icon rendered in a tinted square before the title. */
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Removes the default content padding — for full-bleed lists and charts. */
  contentClassName?: string;
}

/**
 * The dashboard's standard panel: a HeroUI `Card` with a consistent header,
 * so every section on every page shares one rhythm.
 */
export function SectionCard({
  action,
  children,
  className,
  contentClassName,
  description,
  footer,
  icon,
  title,
}: SectionCardProps) {
  return (
    <Card className={cn("gap-4 border border-border p-5", className)}>
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-muted"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <Card.Title className="text-base leading-6 font-semibold">{title}</Card.Title>
            {description ? <Card.Description className="mt-0.5">{description}</Card.Description> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </Card.Header>

      <Card.Content className={cn("gap-3", contentClassName)}>{children}</Card.Content>

      {footer ? <Card.Footer className="mt-1 border-t border-border pt-3">{footer}</Card.Footer> : null}
    </Card>
  );
}
