/**
 * Reading a quiz out of a file the user chose.
 *
 * Both parsers here treat their input as hostile. An HTML file from the
 * internet is a program as much as a document, and a PDF is a container format
 * that has had its share of parser bugs — so nothing is executed, nothing is
 * rendered, and nothing is uploaded. Text comes out; the user checks it; only
 * then does anything reach the database.
 */

/** A parsed question, before the user has confirmed anything. */
export interface DraftQuestion {
  question: string;
  options: string[];
  /** Index into `options`, or null when the file did not say. */
  correctIndex: number | null;
  explanation: string | null;
  /** Why this one needs a human before it can be imported. */
  problem?: string;
}

export interface QuizParseResult {
  questions: DraftQuestion[];
  /** Set when nothing could be read at all, as opposed to reading it badly. */
  fatal?: string;
  /** Anything the user should know that is not a failure. */
  warnings: string[];
}

export const MAX_QUIZ_BYTES = 10 * 1024 * 1024;
export const MAX_QUESTIONS = 300;

/** A question is importable when it has text, two options, and a marked answer. */
export function problemWith(draft: DraftQuestion): string | undefined {
  if (!draft.question.trim()) return "No question text.";
  const filled = draft.options.filter((option) => option.trim());
  if (filled.length < 2) return "Fewer than two options.";
  if (draft.correctIndex === null) return "No correct answer marked.";
  if (draft.correctIndex < 0 || draft.correctIndex >= draft.options.length) {
    return "The marked answer is not one of the options.";
  }
  if (!draft.options[draft.correctIndex]?.trim()) return "The marked answer is blank.";
  return undefined;
}

export function withProblems(questions: DraftQuestion[]): DraftQuestion[] {
  return questions.map((draft) => ({ ...draft, problem: problemWith(draft) }));
}

/* ------------------------------------------------------------------ HTML */

/** `A`, `A.`, `(A)`, `a)` → 0. Returns null for anything else. */
function letterToIndex(raw: string): number | null {
  const match = /^\s*\(?\s*([A-Ha-h])\s*[).:]?\s*$/.exec(raw);
  if (!match) return null;
  return match[1].toUpperCase().charCodeAt(0) - 65;
}

/** Strips a leading `A.` / `1)` label from an option's text. */
function stripLabel(text: string): string {
  return text.replace(/^\s*\(?\s*[A-Ha-h0-9]\s*[).:]\s*/, "").trim();
}

function textOf(node: Element | null): string {
  // `textContent` is inert by construction — it can only ever produce a string.
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Parses an HTML quiz.
 *
 * `DOMParser` with `text/html` builds a detached document: scripts in it are
 * never executed, `<img>` and friends never fetch, and the tree cannot reach
 * the page it was parsed on. Only `textContent` is read out of it, so nothing
 * from the file can become markup here — this is what keeps an imported file
 * from being able to touch the app or its Supabase session.
 *
 * Two shapes are recognised, because those are the two that actually appear:
 * a list-based one (`<li>` options under a heading or `<p>`), and a flat
 * text one where "Correct: B" follows the options.
 */
export function parseQuizHtml(html: string): QuizParseResult {
  if (typeof DOMParser === "undefined") {
    return { questions: [], warnings: [], fatal: "HTML import needs a browser." };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.body) return { questions: [], warnings: [], fatal: "That file has no readable content." };

  const warnings: string[] = [];
  if (doc.querySelector("script")) {
    warnings.push("The file contained scripts. They were ignored — only text was read.");
  }

  const questions: DraftQuestion[] = [];

  /*
   * Shape 1: a container per question, with its options as list items.
   * Anything that holds a `<ul>`/`<ol>` and some text above it qualifies.
   */
  const lists = Array.from(doc.querySelectorAll("ol, ul"));
  for (const list of lists) {
    if (questions.length >= MAX_QUESTIONS) break;

    const items = Array.from(list.children).filter((child) => child.tagName === "LI");
    if (items.length < 2) continue;

    // The question is the nearest preceding text: a heading, a paragraph, or
    // the container's own leading text.
    let questionText = "";
    let cursor: Element | null = list.previousElementSibling;
    while (cursor && !questionText) {
      if (/^(H[1-6]|P|DIV|STRONG|SPAN)$/.test(cursor.tagName)) questionText = textOf(cursor);
      cursor = cursor.previousElementSibling;
    }
    if (!questionText) {
      const parent = list.parentElement;
      questionText = textOf(parent?.querySelector("h1, h2, h3, h4, h5, h6, p") ?? null);
    }

    // A marked answer: a data attribute, a class, or a "Correct: B" line after.
    let correctIndex: number | null = null;
    items.forEach((item, index) => {
      const marked =
        item.hasAttribute("data-correct") ||
        item.getAttribute("data-answer") === "true" ||
        /(^|\s)(correct|is-correct|answer)(\s|$)/i.test(item.getAttribute("class") ?? "");
      if (marked) correctIndex = index;
    });

    if (correctIndex === null) {
      const after = textOf(list.nextElementSibling);
      const stated = /(?:correct|answer)\s*(?:answer)?\s*[:\-]?\s*\(?([A-Ha-h])\)?/i.exec(after);
      if (stated) correctIndex = letterToIndex(stated[1]);
    }

    const options = items.map((item) => stripLabel(textOf(item))).filter((text) => text !== "");
    if (options.length < 2) continue;

    questions.push({
      question: questionText,
      options,
      correctIndex,
      explanation: null,
    });
  }

  // Shape 2: no lists at all — fall back to reading the document as text.
  if (questions.length === 0) {
    const asText = parseQuizText(textOf(doc.body));
    return { ...asText, warnings: [...warnings, ...asText.warnings] };
  }

  return { questions: withProblems(questions), warnings };
}

/* ------------------------------------------------------------------ text / PDF */

/**
 * Parses the flat layout that both plain text and extracted PDF text tend to
 * have:
 *
 *     What is X?
 *     A. first
 *     B. second
 *     Answer: B
 *     Explanation: because …
 *
 * A question ends where the next one begins, so lines are accumulated until an
 * option label appears and then until something that is no longer an option.
 */
export function parseQuizText(text: string): QuizParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "");

  const questions: DraftQuestion[] = [];
  const warnings: string[] = [];

  let questionLines: string[] = [];
  let options: { label: string; text: string }[] = [];
  let correctLetter: string | null = null;
  let explanation: string | null = null;

  const flush = () => {
    if (questionLines.length === 0 && options.length === 0) return;

    const question = questionLines.join(" ").replace(/^\s*\d+\s*[).:]\s*/, "").trim();
    // Copied into a local so narrowing survives into the callback below.
    const letter = correctLetter;
    const correctIndex =
      letter === null
        ? null
        : options.findIndex((option) => option.label.toUpperCase() === letter.toUpperCase());

    questions.push({
      question,
      options: options.map((option) => option.text),
      correctIndex: correctIndex === -1 ? null : correctIndex,
      explanation,
    });

    questionLines = [];
    options = [];
    correctLetter = null;
    explanation = null;
  };

  /*
   * A bare "Correct:" or "Answer:" with the letter on the next line is common
   * enough — it is how the format is usually written out by hand — that the
   * parser carries the expectation forward one line rather than losing it.
   */
  let expectingAnswerLetter = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (questions.length >= MAX_QUESTIONS) {
      warnings.push(`Stopped after ${MAX_QUESTIONS} questions.`);
      break;
    }

    if (expectingAnswerLetter) {
      expectingAnswerLetter = false;
      const bare = /^\(?([A-Ha-h])\)?[).:]?$/.exec(line);
      if (bare) {
        correctLetter = bare[1];
        continue;
      }
      // Not a letter after all — fall through and treat the line normally.
    }

    // A standalone label ("Question:", "Q:") introduces the stem rather than
    // being part of it.
    if (/^(?:question|q)\s*[:\-]?$/i.test(line)) continue;

    // "Answer: B" / "Correct answer - C", or the label alone.
    const answer = /^(?:correct\s*answer|correct|answer|ans)\s*[:\-]?\s*\(?([A-Ha-h])\)?\s*$/i.exec(line);
    if (answer) {
      correctLetter = answer[1];
      continue;
    }
    if (/^(?:correct\s*answer|correct|answer|ans)\s*[:\-]\s*$/i.test(line)) {
      expectingAnswerLetter = true;
      continue;
    }

    const explains = /^(?:explanation|rationale|why)\s*[:\-]\s*(.+)$/i.exec(line);
    if (explains) {
      explanation = explains[1].trim();
      continue;
    }
    // The same label with its text on the following line.
    if (/^(?:explanation|rationale|why)\s*[:\-]?\s*$/i.test(line) && lines[index + 1]) {
      explanation = lines[index + 1];
      index += 1;
      continue;
    }

    // "A. option" / "(b) option" / "C) option"
    const option = /^\(?([A-Ha-h])\)?\s*[).:]\s*(.+)$/.exec(line);
    if (option && questionLines.length > 0) {
      options.push({ label: option[1], text: option[2].trim() });
      continue;
    }

    // Anything else starts a new question once the previous one has options.
    if (options.length > 0) flush();
    questionLines.push(line);
  }

  flush();

  const usable = questions.filter((draft) => draft.options.length > 0);
  if (usable.length === 0) {
    return {
      questions: [],
      warnings,
      fatal:
        "No questions could be read. The importer expects a question followed by lettered options — for example “A. …”, “B. …” — and optionally “Answer: B”.",
    };
  }

  return { questions: withProblems(usable), warnings };
}

/**
 * Pulls the text out of a PDF, page by page.
 *
 * pdf.js is loaded on demand rather than bundled: it is by far the largest
 * thing in the app, and most sessions never open the importer. The worker it
 * needs is copied into `public/` by `scripts/copy-pdf-worker.mjs`.
 *
 * A PDF with no text layer is a scan. There is no OCR here, and guessing would
 * be worse than saying so — so that case is reported rather than turned into
 * plausible-looking nonsense.
 */
export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const document_ = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Nothing in the file is allowed to pull anything else in.
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;

  const pages: string[] = [];
  for (let number = 1; number <= document_.numPages; number += 1) {
    const page = await document_.getPage(number);
    const content = await page.getTextContent();

    /*
     * pdf.js returns positioned runs, not lines. `hasEOL` is its own marker for
     * where a line ended, and using it is far more reliable than trying to
     * reconstruct lines from coordinates.
     */
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }

  await document_.destroy();
  return { text: pages.join("\n"), pages: document_.numPages };
}

/** The whole PDF path: extract, then parse, with an honest failure for scans. */
export async function parseQuizPdf(file: File): Promise<QuizParseResult> {
  let extracted: { text: string; pages: number };
  try {
    extracted = await extractPdfText(file);
  } catch (error) {
    return {
      questions: [],
      warnings: [],
      fatal: `That PDF could not be opened: ${(error as Error).message}`,
    };
  }

  // A handful of characters across several pages means the pages are images.
  if (extracted.text.replace(/\s/g, "").length < 40) {
    return {
      questions: [],
      warnings: [],
      fatal:
        `No text could be extracted from ${extracted.pages} ${extracted.pages === 1 ? "page" : "pages"}. ` +
        "This looks like a scanned PDF — the pages are images, not text. Optical character " +
        "recognition would be needed to read it, which this importer does not do. Export the " +
        "quiz as text, HTML, CSV or JSON instead.",
    };
  }

  const parsed = parseQuizText(extracted.text);
  return {
    ...parsed,
    warnings: [
      `Read ${extracted.pages} ${extracted.pages === 1 ? "page" : "pages"} of text.`,
      ...parsed.warnings,
    ],
  };
}
