/**
 * Copies pdf.js's worker into `public/` so the static export can serve it.
 *
 * The PDF quiz importer runs pdf.js in a worker, and pdf.js needs to be told
 * where that worker lives. Under `output: "export"` there is no bundler step
 * that can resolve it out of `node_modules` at runtime, and inside the Capacitor
 * WebView the only thing that resolves is a path under the app's own assets —
 * so the file is copied next to them and referenced as `/pdf.worker.min.mjs`.
 *
 * Run from `postinstall`, so bumping pdfjs-dist cannot leave a worker from the
 * previous version behind: a mismatched pair fails at runtime with an opaque
 * message about the API version.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const pdfjs = dirname(require.resolve("pdfjs-dist/package.json"));
  const source = join(pdfjs, "build", "pdf.worker.min.mjs");
  mkdirSync("public", { recursive: true });
  copyFileSync(source, join("public", "pdf.worker.min.mjs"));
  console.log("Copied pdf.worker.min.mjs into public/");
} catch (error) {
  // A missing worker only breaks the PDF importer, and the importer says so.
  // It must not break `npm ci` for everybody else.
  console.warn(`Could not copy the pdf.js worker: ${error.message}`);
}
