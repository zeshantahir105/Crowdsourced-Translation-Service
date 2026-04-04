/** Matches backend / AI-service “translation unavailable” copy (including legacy tags). */
export function isTranslationServiceFailureText(s: string | null | undefined): boolean {
  if (s == null || typeof s !== "string") return true;
  const t = s.trim();
  if (!t) return true;
  if (t.startsWith("The translation service is not working properly")) return true;
  if (t.startsWith("[AI unavailable]")) return true;
  if (t.startsWith("[Preview unavailable]")) return true;
  if (t.startsWith("[No translation provider")) return true;
  return false;
}

export const TRANSLATION_SERVICE_HELP =
  "The translation service is not responding. Check that the AI service is running and API keys are set, then try again.";
