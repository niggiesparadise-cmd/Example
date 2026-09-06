/**
 * A small RFC 4180 CSV reader.
 *
 * Hand-written rather than a dependency: the whole of the format that matters
 * here is quoting, escaped quotes, and newlines inside quoted fields, which is
 * the loop below. A parser this size is easier to reason about than an
 * additional package, and it has no opinion about what the columns mean.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM: spreadsheets add one, and it would otherwise become part
  // of the first header name.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat CRLF as one break rather than an empty row between the two.
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Whatever is still in hand is the last field, unless the file ended cleanly
  // on a newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
