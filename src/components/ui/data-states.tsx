import { Button, Card, EmptyState, Skeleton, Spinner, cn } from "@heroui/react";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Placeholder rows sized like the list they replace, so nothing jumps on load. */
export function ListSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3 rounded-lg" />
          <Skeleton className="h-3 w-1/3 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Screen-reader announcement for an in-progress load. */
export function LoadingRegion({ label }: { label: string }) {
  return (
    <span aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

/**
 * A failed read. Always offers a retry — an error the user cannot act on is
 * just a dead end.
 */
export function ErrorState({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: Error;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-danger-soft text-danger-soft-foreground">
        <TriangleAlert aria-hidden="true" className="size-5" strokeWidth={1.85} />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{error.message}</p>
      </div>
      {onRetry ? (
        <Button onPress={onRetry} size="sm" variant="secondary">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Nothing here yet — with the action that fixes it, where there is one. */
export function NoData({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <EmptyState className="mx-auto max-w-sm py-8 text-center">
      {icon ? (
        <span
          aria-hidden="true"
          className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-surface-secondary text-muted"
        >
          {icon}
        </span>
      ) : null}
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </EmptyState>
  );
}

/** Full-page spinner, used while the session is being restored. */
export function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p aria-live="polite" className="text-sm text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

/** The build-time misconfiguration case, shown instead of an endless spinner. */
export function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="max-w-md gap-3 border border-border p-6">
        <Card.Header className="flex-row items-center gap-2">
          <TriangleAlert aria-hidden="true" className="size-5 text-danger" strokeWidth={1.85} />
          <Card.Title className="text-base font-semibold">Supabase isn&apos;t configured</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-muted">{message}</p>
        </Card.Content>
      </Card>
    </div>
  );
}
