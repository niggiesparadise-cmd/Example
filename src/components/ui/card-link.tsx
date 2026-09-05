import { Link } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The quiet "see everything" link in a card header.
 *
 * HeroUI's `Link` sits on React Aria, so `RouterProvider` turns it into a
 * client-side Next transition without a `next/link` wrapper.
 */
export function CardLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link className="gap-0.5 text-sm text-muted hover:text-foreground" href={href}>
      {children}
      <Link.Icon className="opacity-100">
        <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.85} />
      </Link.Icon>
    </Link>
  );
}
