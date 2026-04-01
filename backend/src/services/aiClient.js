const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_SECRET = process.env.AI_SERVICE_SECRET || "";

export async function fetchDraftTranslation({
  text,
  sourceLang,
  targetLang,
  domain,
}) {
  const res = await fetch(`${AI_URL}/translate/draft`, {
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
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.translated_text || "";
}
