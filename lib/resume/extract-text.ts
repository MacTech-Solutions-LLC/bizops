/**
 * Resume text extraction — in memory, always.
 *
 * This module is the enforcement point for the "resumes are never stored"
 * requirement. It takes bytes, returns a string, and holds no reference to
 * either afterwards. It deliberately does not import `@/lib/storage` — if a
 * future change needs a StorageAdapter in here, that is a signal the privacy
 * boundary is being crossed and it should be challenged in review, not wired up.
 *
 * Nothing here writes to disk, to Postgres, or to a temp file.
 */

import { ValidationError } from "@/lib/errors";

/** Upper bound on an accepted upload. Resumes are prose; anything larger is
 * either not a resume or an attempt to exhaust memory on the server. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Minimum extracted characters for a parse to be worth attempting. Below this
 * we almost certainly got a scanned image or an encrypted PDF. */
const MIN_USEFUL_CHARS = 120;

export const ACCEPTED_RESUME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/markdown",
] as const;

export type AcceptedResumeType = (typeof ACCEPTED_RESUME_TYPES)[number];

export interface ExtractedResume {
  text: string;
  /** Page count for PDFs; undefined for formats without pagination. */
  pageCount?: number;
}

function isAccepted(type: string): type is AcceptedResumeType {
  return (ACCEPTED_RESUME_TYPES as readonly string[]).includes(type);
}

/**
 * Normalise whitespace without destroying line structure — the heuristic layer
 * relies on line breaks to find section headings, so this collapses runs of
 * spaces and blank lines but keeps single newlines intact.
 */
function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedResume> {
  // Imported lazily: unpdf pulls in a sizeable pdf.js build, and most requests
  // in this app never touch a PDF.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(doc, { mergePages: true });
  return { text: normalise(text), pageCount: totalPages };
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractedResume> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return { text: normalise(value) };
}

/**
 * Extract plain text from resume bytes.
 *
 * @throws ValidationError when the file is too large, an unsupported type, or
 * yields too little text to parse (scanned/image-only PDFs land here).
 */
export async function extractResumeText(
  bytes: Uint8Array,
  contentType: string,
  filename: string,
): Promise<ExtractedResume> {
  if (bytes.byteLength === 0) {
    throw new ValidationError("Resume file is empty", {
      userMessage: "That file is empty. Please choose your resume file.",
    });
  }
  if (bytes.byteLength > MAX_RESUME_BYTES) {
    throw new ValidationError("Resume file exceeds size limit", {
      userMessage: `That file is larger than ${Math.floor(
        MAX_RESUME_BYTES / (1024 * 1024),
      )}MB. Please upload a smaller file.`,
    });
  }
  if (!isAccepted(contentType)) {
    throw new ValidationError(`Unsupported resume type: ${contentType}`, {
      userMessage: "Please upload a PDF, Word (.docx), or plain text resume.",
    });
  }

  let extracted: ExtractedResume;
  try {
    switch (contentType) {
      case "application/pdf":
        extracted = await extractPdf(bytes);
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        extracted = await extractDocx(bytes);
        break;
      default:
        extracted = { text: normalise(new TextDecoder().decode(bytes)) };
    }
  } catch (cause) {
    // Never surface the parser's internals — they can echo document content.
    throw new ValidationError(`Could not read resume: ${filename}`, {
      userMessage:
        "We couldn't read that file. It may be password-protected or corrupted. Try exporting it again as a PDF.",
      cause,
    });
  }

  if (extracted.text.length < MIN_USEFUL_CHARS) {
    throw new ValidationError("Resume yielded too little text", {
      userMessage:
        "We couldn't find any text in that file — it may be a scan or an image. Please upload a text-based PDF or a Word document.",
    });
  }

  return extracted;
}
