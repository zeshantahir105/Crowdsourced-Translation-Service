const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SECRET = process.env.AI_SERVICE_SECRET || "";

/** Long document drafts chunk in the AI service; allow enough time for many segments. */
const AI_DRAFT_TIMEOUT_MS = Number(process.env.AI_DRAFT_TIMEOUT_MS || 600_000);

export async function fetchDraftTranslation({
  text,
  sourceLang,
  targetLang,
  domain,
}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), AI_DRAFT_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${AI_URL}/translate/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AI_SECRET ? { "X-Service-Secret": AI_SECRET } : {}),
      },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        domain: domain || "general",
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.translated_text || "";
}
