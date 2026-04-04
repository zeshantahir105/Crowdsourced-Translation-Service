/**
 * User-facing copy when the AI microservice fails, times out, or is unreachable.
 * Keep in sync with the friendly opening line in ai-service `translate.py` mock output.
 */
export const TRANSLATION_SERVICE_DOWN_MESSAGE =
  "The translation service is not working properly right now. Please try again in a moment. If this keeps happening, check that the AI service is running and API keys are configured.";

export function appendSourceSnippet(message, text, maxLen = 400) {
  const raw = text == null ? "" : String(text);
  const clip = raw.slice(0, maxLen);
  const suffix = raw.length > maxLen ? "…" : "";
  if (!clip) return message;
  return `${message}\n\n---\n${clip}${suffix}`;
}

/** Stored as aiDraft or returned from /translate/preview when the backend cannot get a real translation. */
export function translationServiceFailureWithSnippet(sourceText, maxLen = 400) {
  return appendSourceSnippet(TRANSLATION_SERVICE_DOWN_MESSAGE, sourceText, maxLen);
}

/**
 * True for empty/null or any known failure placeholder (current wording or legacy tags).
 * Used to decide whether client-side draft can replace server draft, queue retries, etc.
 */
export function isTranslationServiceFailureText(s) {
  if (s == null) return true;
  if (typeof s !== "string") return true;
  const t = s.trim();
  if (!t) return true;
  if (t.startsWith(TRANSLATION_SERVICE_DOWN_MESSAGE)) return true;
  if (t.startsWith("The translation service is not working properly")) return true;
  if (t.startsWith("[AI unavailable]")) return true;
  if (t.startsWith("[Preview unavailable]")) return true;
  if (t.startsWith("[No translation provider")) return true;
  return false;
}
