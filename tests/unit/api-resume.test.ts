import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { setupTestDb } from "../helpers/db";
import { makeUser, routeParams } from "../helpers/api";
import { POST } from "@/../app/api/resumes/parse/route";

setupTestDb();
const P = routeParams();

async function makePdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = 700;
  for (const line of text.split("\n")) {
    page.drawText(line, { x: 40, y, size: 12, font });
    y -= 18;
  }
  return Buffer.from(await doc.save());
}

function formReq(buf: Buffer, name: string, token: string) {
  const fd = new FormData();
  // Buffer's ArrayBufferLike type (which admits SharedArrayBuffer) doesn't
  // structurally satisfy BlobPart's ArrayBufferView<ArrayBuffer>; a plain
  // Uint8Array copy of the same bytes does.
  fd.set(
    "file",
    new File([new Uint8Array(buf)], name, { type: name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream" })
  );
  return new NextRequest("http://localhost/api/resumes/parse", {
    method: "POST", body: fd, headers: { host: "localhost", cookie: `aw_session=${token}` },
  });
}

describe("POST /api/resumes/parse", () => {
  it("recruiter uploads a PDF resume and gets extracted fields back", async () => {
    const { token } = await makeUser("recruiter");
    const buf = await makePdf("Jane Doe\njane@example.com\n+1 555 123 4567\nSkills: React, TypeScript");

    const res = await POST(formReq(buf, "resume.pdf", token), P);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fields.email).toBe("jane@example.com");
    expect(body.fields.skills).toContain("React");
    expect(typeof body.text).toBe("string");
  });

  it("a plain-text buffer disguised as a resume is rejected with 422", async () => {
    const { token } = await makeUser("recruiter");
    const buf = Buffer.from("Just some plain text, not a real PDF or DOCX file at all.");

    const res = await POST(formReq(buf, "notes.txt", token), P);

    expect(res.status).toBe(422);
  });

  it("interviewer is forbidden (403)", async () => {
    const { token } = await makeUser("interviewer");
    const buf = await makePdf("Jane Doe\njane@example.com");

    const res = await POST(formReq(buf, "resume.pdf", token), P);

    expect(res.status).toBe(403);
  });

  it("a corrupt PDF (valid magic bytes, garbage body) is rejected with 422", async () => {
    const { token } = await makeUser("recruiter");
    const buf = Buffer.concat([Buffer.from("%PDF-"), Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x10, 0x20])]);

    const res = await POST(formReq(buf, "resume.pdf", token), P);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Couldn't read that file — it may be corrupted or image-only");
  });

  it("a corrupt DOCX (valid zip magic bytes, garbage body) is rejected with 422", async () => {
    const { token } = await makeUser("recruiter");
    const buf = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x10, 0x20]),
    ]);

    const res = await POST(formReq(buf, "resume.docx", token), P);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Couldn't read that file — it may be corrupted or image-only");
  });

  it("a file over 5 MB is rejected with 413", async () => {
    const { token } = await makeUser("recruiter");
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    Buffer.from("%PDF-").copy(oversized, 0);

    const res = await POST(formReq(oversized, "resume.pdf", token), P);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("File too large (max 5 MB)");
  });

  it("a PDF with under 20 characters of extractable text is rejected with 422", async () => {
    const { token } = await makeUser("recruiter");
    const buf = await makePdf("Hi");

    const res = await POST(formReq(buf, "resume.pdf", token), P);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Couldn't read any text from that file");
  });
});
