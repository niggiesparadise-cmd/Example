import { parseCsv } from "./csv";

/**
 * Reading flashcards out of a file the user chose.
 *
 * Everything happens on the device. Nothing is uploaded: the file is read as
 * text, parsed here, shown back for confirmation, and only the rows the user
 * accepts are written to the database.
 */

/** Bigger than any plausible deck, small enough that parsing stays instant. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
/** A ceiling on one import, so a runaway file cannot fire thousands of inserts. */
export const MAX_CARDS = 1000;

export interface ParsedCard {
  front: string;
  back: string;
}

export interface RejectedRow {
  /** 1-based, counting the way the user's editor would. */
  line: number;
  reason: string;
  /** What was there, truncated — enough to find it, not enough to fill a dialog. */
  preview: string;
}

export interface FlashcardParseResult {
  format: "json" | "csv" | "text";
  cards: ParsedCard[];
  rejected: RejectedRow[];
  /** Set when the file could not be read at all, as opposed to having bad rows. */
  fatal?: string;
}

const FRONT_KEYS = ["front", "question", "term", "q", "prompt"];
const BACK_KEYS = ["back", "answer", "definition", "a", "response"];

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncate(value: string, length = 60): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

/** Accepts a card if both sides have content and neither is absurdly long. */
function validate(front: string, back: string): string | undefined {
  if (!front && !back) return "Both sides are empty.";
  if (!front) return "No question.";
  if (!back) return "No answer.";
  if (front.length > 2000 || back.length > 2000) return "Longer than 2000 characters.";
  return undefined;
}

/** JSON: an array of objects, or `{ cards: [...] }`. */
function fromJson(text: string): FlashcardParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      format: "json",
      cards: [],
      rejected: [],
      fatal: `That is not valid JSON: ${(error as Error).message}`,
    };
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { cards?: unknown })?.cards)
      ? ((data as { cards: unknown[] }).cards)
      : null;

  if (!list) {
    return {
      format: "json",
      cards: [],
      rejected: [],
      fatal: 'Expected an array of cards, or an object with a "cards" array.',
    };
  }

  const cards: ParsedCard[] = [];
  const rejected: RejectedRow[] = [];

  list.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      rejected.push({ line: index + 1, reason: "Not an object.", preview: truncate(String(entry)) });
      return;
    }

    const record = entry as Record<string, unknown>;
    // Match the key case-insensitively; exports vary on capitalisation.
    const lower = new Map(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
    const front = clean(FRONT_KEYS.map((key) => lower.get(key)).find((value) => clean(value)));
    const back = clean(BACK_KEYS.map((key) => lower.get(key)).find((value) => clean(value)));

    const problem = validate(front, back);
    if (problem) {
      rejected.push({ line: index + 1, reason: problem, preview: truncate(front || back || "—") });
      return;
    }
    cards.push({ front, back });
  });

  return { format: "json", cards, rejected };
}

/** CSV: a header row naming the two columns, or just two columns. */
function fromCsv(text: string): FlashcardParseResult {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) {
    return { format: "csv", cards: [], rejected: [], fatal: "The file is empty." };
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  let frontIndex = header.findIndex((cell) => FRONT_KEYS.includes(cell));
  let backIndex = header.findIndex((cell) => BACK_KEYS.includes(cell));
  let body = rows;

  if (frontIndex >= 0 && backIndex >= 0) {
    body = rows.slice(1);
  } else {
    // No recognisable header: assume the first two columns, and keep row one.
    frontIndex = 0;
    backIndex = 1;
  }

  const cards: ParsedCard[] = [];
  const rejected: RejectedRow[] = [];
  const offset = body === rows ? 1 : 2;

  body.forEach((row, index) => {
    const front = clean(row[frontIndex]);
    const back = clean(row[backIndex]);
    const problem = row.length < 2 ? "Fewer than two columns." : validate(front, back);
    if (problem) {
      rejected.push({
        line: index + offset,
        reason: problem,
        preview: truncate(row.join(", ")),
      });
      return;
    }
    cards.push({ front, back });
  });

  return { format: "csv", cards, rejected };
}

/**
 * Plain text: one card per line, the two sides separated by a tab, a semicolon,
 * or ` - `. Blank lines and `#` comments are ignored rather than rejected —
 * they are formatting, not mistakes.
 */
function fromText(text: string): FlashcardParseResult {
  const cards: ParsedCard[] = [];
  const rejected: RejectedRow[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;

    const separator = line.includes("\t")
      ? "\t"
      : line.includes(";")
        ? ";"
        : line.includes(" - ")
          ? " - "
          : null;

    if (!separator) {
      rejected.push({
        line: index + 1,
        reason: "No separator — use a tab, a semicolon, or ' - '.",
        preview: truncate(line),
      });
      return;
    }

    const at = line.indexOf(separator);
    const front = line.slice(0, at).trim();
    const back = line.slice(at + separator.length).trim();

    const problem = validate(front, back);
    if (problem) {
      rejected.push({ line: index + 1, reason: problem, preview: truncate(line) });
      return;
    }
    cards.push({ front, back });
  });

  return { format: "text", cards, rejected };
}

/** Picks a parser from the file's name, falling back to its content. */
export function parseFlashcardFile(name: string, text: string): FlashcardParseResult {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json")) return fromJson(text);
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) return fromCsv(text);
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return fromText(text);

  // Unknown extension: a leading bracket or brace is JSON, a comma in the first
  // line suggests CSV, and anything else is treated as plain text.
  const head = text.trimStart();
  if (head.startsWith("[") || head.startsWith("{")) return fromJson(text);
  if ((text.split(/\r?\n/)[0] ?? "").includes(",")) return fromCsv(text);
  return fromText(text);
}

/** Refuses a file before it is read, with a message that says why. */
export function describeImportFile(file: File): string | undefined {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_IMPORT_BYTES) return "That file is larger than 2 MB.";
  return undefined;
}
