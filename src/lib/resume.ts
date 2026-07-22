import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "./api-error";

export const KNOWN_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C#",
  "Go",
  "Rust",
  "SQL",
  "MongoDB",
  "PostgreSQL",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "GraphQL",
  "REST",
  "HTML",
  "CSS",
  "Tailwind",
  "Figma",
  "Jira",
  "Agile",
  "Scrum",
  "CI/CD",
  "Git",
  "Linux",
  "Redis",
  "Kafka",
  "Spark",
  "Pandas",
  "Machine Learning",
  "Data Analysis",
  "Product Management",
  "Marketing",
  "SEO",
  "Sales",
  "Recruiting",
  "Excel",
  "Communication",
  "Leadership",
  "Angular",
  "Vue",
  "C++",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "Django",
  "Flask",
  "Spring",
  ".NET",
  "Salesforce",
  "Tableau",
  "Jenkins",
  "TensorFlow",
] as const;

export interface ExtractedFields {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

// \b relies on a word/non-word transition on *both* sides of the boundary
// position, so it silently fails whenever a token itself ends (or starts)
// with a non-word character — e.g. "C#" followed by a comma: both "#" and
// "," are non-word, so there's no transition and \bC#\b never matches.
// Lookarounds sidestep that: they just check "is the adjacent character (if
// any) alphanumeric?", independent of what the matched token's edge chars
// are. That makes "C#", "Next.js", and "CI/CD" match standalone while still
// keeping "Java" from matching inside "JavaScript".
function skillRegex(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i");
}

export function extractResumeFields(text: string): ExtractedFields {
  const fields: ExtractedFields = { skills: [] };

  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) fields.email = emailMatch[0];

  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) fields.phone = phoneMatch[0].trim();

  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (firstLine) {
    const trimmed = firstLine.trim();
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 5 && trimmed.length <= 60 && !/\d/.test(trimmed) && !trimmed.includes("@")) {
      fields.name = trimmed;
    }
  }

  fields.skills = KNOWN_SKILLS.filter((skill) => skillRegex(skill).test(text));

  return fields;
}

export async function parseResumeBuffer(buf: Buffer, filename: string): Promise<string> {
  let text = "";
  try {
    if (buf.subarray(0, 4).toString("latin1") === "%PDF") {
      // pdf-parse's bundled pdf.js (v1.10.100) mis-parses the xref table for
      // some otherwise-valid PDFs when handed a genuine Node Buffer — it
      // reliably works given a plain Uint8Array of the same bytes instead.
      // (Cast is safe: our Uint8Array is only ever read, never Buffer-specific methods.)
      text = (await pdfParse(new Uint8Array(buf) as unknown as Buffer)).text;
    } else if (buf[0] === 0x50 && buf[1] === 0x4b && filename.toLowerCase().endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else {
      throw new ApiError(422, "Unsupported file type — upload a PDF or DOCX");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(422, "Couldn't read that file — it may be corrupted or image-only");
  }
  if (text.trim().length < 20) throw new ApiError(422, "Couldn't read any text from that file");
  return text;
}
