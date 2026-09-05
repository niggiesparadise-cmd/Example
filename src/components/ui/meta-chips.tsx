import { Chip } from "@heroui/react";
import type { TaskPriority } from "@/types";

const priorityLabels: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityColors: Record<TaskPriority, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
};

/** Task priority as a chip. The word carries the meaning, not the colour. */
export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip color={priorityColors[priority]} size="sm" variant="soft">
      {priorityLabels[priority]} priority
    </Chip>
  );
}

/**
 * A due-date chip that turns urgent as the deadline approaches.
 *
 * Colour is doubled by the wording — “Overdue”, “Due today”, “Due Friday” — so
 * the urgency reads without relying on hue.
 */
export function DueChip({ daysAway, label }: { daysAway: number; label: string }) {
  const color = daysAway <= 0 ? "danger" : daysAway <= 2 ? "warning" : "default";
  return (
    <Chip color={color} size="sm" variant="soft">
      {label}
    </Chip>
  );
}
