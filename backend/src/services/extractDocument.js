import fs from "fs/promises";
import mammoth from "mammoth";

export async function extractTextFromFile(filePath, mimeType) {
  if (mimeType === "text/plain") {
    const buf = await fs.readFile(filePath);
    return buf.toString("utf8");
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buf = await fs.readFile(filePath);
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value || "";
  }
  if (mimeType === "application/pdf") {
    const buf = await fs.readFile(filePath);
    const mod = await import("pdf-parse");
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buf);
    return (data.text || "").trim();
  }
  throw new Error("Unsupported document type");
}
