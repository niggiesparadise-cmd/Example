import { Card } from "@heroui/react";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { site } from "@/config/site";

/** The shared frame for sign-in, sign-up and password recovery. */
export function AuthLayout({
  children,
  description,
  footer,
  title,
}: {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <GraduationCap aria-hidden="true" className="size-5" strokeWidth={2} />
        </span>
        <span>
          <span className="block font-display text-xl leading-none font-semibold text-foreground">{site.name}</span>
          <span className="block text-xs text-muted">{site.tagline}</span>
        </span>
      </div>

      <Card className="w-full max-w-sm gap-5 border border-border p-6">
        <Card.Header>
          <Card.Title className="font-display text-lg font-semibold">{title}</Card.Title>
          <Card.Description className="mt-1">{description}</Card.Description>
        </Card.Header>
        <Card.Content className="gap-4">{children}</Card.Content>
      </Card>

      {footer ? <div className="text-sm text-muted">{footer}</div> : null}
    </div>
  );
}
