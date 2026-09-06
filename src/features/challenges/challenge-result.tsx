"use client";

import { cn } from "@heroui/react";
import { Minus, Trophy } from "lucide-react";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ProfileAvatar, UserAvatar } from "@/features/profile/user-avatar";
import { formatDuration } from "@/lib/format";
import { percentageOf, verdictOf, type ChallengeView } from "./api";

/**
 * The head-to-head scoreboard.
 *
 * Both scores side by side, the verdict underneath, and one short entrance
 * animation — the result is the moment the feature exists for, and it should
 * land rather than simply appear. It stays friendly: nobody is ranked, nothing
 * is public, and "lost" is phrased as the opponent winning.
 */
export function ChallengeResult({ view }: { view: ChallengeView }) {
  const verdict = verdictOf(view);
  const mine = percentageOf(view.me);
  const theirs = percentageOf(view.them);

  const headline =
    verdict === "won" ? "You won" : verdict === "lost" ? "Opponent won" : verdict === "draw" ? "Draw" : "In progress";

  return (
    <GlassSurface className="page-enter flex flex-col gap-4 p-5" radius="lg" tone="strong">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Side
          avatar={<UserAvatar size="lg" />}
          isWinner={verdict === "won"}
          name="You"
          seconds={view.me?.duration_seconds ?? null}
          percentage={mine}
        />

        <span className="text-xs font-semibold tracking-wide text-muted uppercase">vs</span>

        <Side
          avatar={<ProfileAvatar profile={view.opponent} size="lg" />}
          isWinner={verdict === "lost"}
          name={view.opponent?.full_name ?? view.opponent?.username ?? "Opponent"}
          seconds={view.them?.duration_seconds ?? null}
          percentage={theirs}
        />
      </div>

      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-[var(--radius-glass)] px-4 py-3",
          verdict === "won" && "bg-success-soft text-success-soft-foreground",
          verdict === "lost" && "bg-surface-secondary text-foreground",
          verdict === "draw" && "bg-accent-soft text-accent",
          verdict === "unfinished" && "bg-surface-secondary text-muted",
        )}
      >
        {verdict === "draw" ? (
          <Minus aria-hidden="true" className="size-4" strokeWidth={2.4} />
        ) : verdict !== "unfinished" ? (
          <Trophy aria-hidden="true" className="size-4" strokeWidth={2.1} />
        ) : null}
        <span className="text-sm font-semibold">{headline}</span>
      </div>
    </GlassSurface>
  );
}

function Side({
  avatar,
  isWinner,
  name,
  percentage,
  seconds,
}: {
  avatar: React.ReactNode;
  isWinner: boolean;
  name: string;
  percentage: number | null;
  seconds: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <span className={cn("rounded-full", isWinner && "ring-2 ring-success ring-offset-2 ring-offset-transparent")}>
        {avatar}
      </span>
      <span className="w-full truncate text-xs font-medium text-muted">{name}</span>
      <span className="tabular font-display text-2xl leading-none font-semibold text-foreground">
        {percentage === null ? "—" : `${percentage}%`}
      </span>
      {seconds !== null ? (
        <span className="tabular text-[11px] text-muted">
          {formatDuration(Math.max(1, Math.round(seconds / 60)))}
        </span>
      ) : (
        <span className="text-[11px] text-muted">Not finished</span>
      )}
    </div>
  );
}
