/** ISO-style codes passed to the API (OpenAI / DeepL where supported). */
export type LanguageDef = { code: string; label: string };

/** Shown first in dropdowns (matches product “suggested” set). */
export const SUGGESTED_LANGUAGE_CODES = ["EN", "DE", "FR", "JA", "ES", "IT"] as const;

/**
 * Every language except “Detect language”. Sorted by label for the “All languages” group.
 * AUTO is source-only and inserted in UI helpers below.
 */
const ALL_NO_AUTO: LanguageDef[] = [
  { code: "ACE", label: "Acehnese" },
  { code: "AF", label: "Afrikaans" },
  { code: "SQ", label: "Albanian" },
  { code: "AR", label: "Arabic" },
  { code: "AN", label: "Aragonese" },
  { code: "HY", label: "Armenian" },
  { code: "AS", label: "Assamese" },
  { code: "AY", label: "Aymara" },
  { code: "AZ", label: "Azerbaijani" },
  { code: "BA", label: "Bashkir" },
  { code: "EU", label: "Basque" },
  { code: "BE", label: "Belarusian" },
  { code: "BN", label: "Bengali" },
  { code: "BHO", label: "Bhojpuri" },
  { code: "BS", label: "Bosnian" },
  { code: "BR", label: "Breton" },
  { code: "BG", label: "Bulgarian" },
  { code: "MY", label: "Burmese" },
  { code: "YUE", label: "Cantonese" },
  { code: "CA", label: "Catalan" },
  { code: "CEB", label: "Cebuano" },
  { code: "ZH", label: "Chinese" },
  { code: "HR", label: "Croatian" },
  { code: "CS", label: "Czech" },
  { code: "DA", label: "Danish" },
  { code: "PRS", label: "Dari" },
  { code: "NL", label: "Dutch" },
  { code: "EN", label: "English" },
  { code: "EO", label: "Esperanto" },
  { code: "ET", label: "Estonian" },
  { code: "FI", label: "Finnish" },
  { code: "FR", label: "French" },
  { code: "GL", label: "Galician" },
  { code: "KA", label: "Georgian" },
  { code: "DE", label: "German" },
  { code: "EL", label: "Greek" },
  { code: "GN", label: "Guarani" },
  { code: "GU", label: "Gujarati" },
  { code: "HT", label: "Haitian Creole" },
  { code: "HA", label: "Hausa" },
  { code: "HE", label: "Hebrew" },
  { code: "HI", label: "Hindi" },
  { code: "HU", label: "Hungarian" },
  { code: "IS", label: "Icelandic" },
  { code: "IG", label: "Igbo" },
  { code: "ID", label: "Indonesian" },
  { code: "GA", label: "Irish" },
  { code: "IT", label: "Italian" },
  { code: "JA", label: "Japanese" },
  { code: "JV", label: "Javanese" },
  { code: "PAM", label: "Kapampangan" },
  { code: "KK", label: "Kazakh" },
  { code: "KOK", label: "Konkani" },
  { code: "KO", label: "Korean" },
  { code: "KMR", label: "Kurdish (Kurmanji)" },
  { code: "CKB", label: "Kurdish (Sorani)" },
  { code: "KY", label: "Kyrgyz" },
  { code: "LA", label: "Latin" },
  { code: "LV", label: "Latvian" },
  { code: "LN", label: "Lingala" },
  { code: "LT", label: "Lithuanian" },
  { code: "LMO", label: "Lombard" },
  { code: "LB", label: "Luxembourgish" },
  { code: "MK", label: "Macedonian" },
  { code: "MAI", label: "Maithili" },
  { code: "MG", label: "Malagasy" },
  { code: "MS", label: "Malay" },
  { code: "ML", label: "Malayalam" },
  { code: "MT", label: "Maltese" },
  { code: "MI", label: "Maori" },
  { code: "MR", label: "Marathi" },
  { code: "MN", label: "Mongolian" },
  { code: "NE", label: "Nepali" },
  { code: "NB", label: "Norwegian (bokmål)" },
  { code: "OC", label: "Occitan" },
  { code: "OM", label: "Oromo" },
  { code: "PAG", label: "Pangasinan" },
  { code: "PS", label: "Pashto" },
  { code: "FA", label: "Persian" },
  { code: "PL", label: "Polish" },
  { code: "PT", label: "Portuguese" },
  { code: "PA", label: "Punjabi" },
  { code: "QU", label: "Quechua" },
  { code: "RO", label: "Romanian" },
  { code: "RU", label: "Russian" },
  { code: "SA", label: "Sanskrit" },
  { code: "SR", label: "Serbian" },
  { code: "ST", label: "Sesotho" },
  { code: "SCN", label: "Sicilian" },
  { code: "SK", label: "Slovak" },
  { code: "SL", label: "Slovenian" },
  { code: "ES", label: "Spanish" },
  { code: "SU", label: "Sundanese" },
  { code: "SW", label: "Swahili" },
  { code: "SV", label: "Swedish" },
  { code: "TL", label: "Tagalog" },
  { code: "TG", label: "Tajik" },
  { code: "TA", label: "Tamil" },
  { code: "TT", label: "Tatar" },
  { code: "TE", label: "Telugu" },
  { code: "TS", label: "Tsonga" },
  { code: "TN", label: "Tswana" },
  { code: "TR", label: "Turkish" },
  { code: "TK", label: "Turkmen" },
  { code: "UK", label: "Ukrainian" },
  { code: "UR", label: "Urdu" },
  { code: "UZ", label: "Uzbek" },
  { code: "VI", label: "Vietnamese" },
  { code: "CY", label: "Welsh" },
  { code: "WO", label: "Wolof" },
  { code: "XH", label: "Xhosa" },
  { code: "YI", label: "Yiddish" },
  { code: "ZU", label: "Zulu" },
].sort((a, b) => a.label.localeCompare(b.label, "en"));

const suggestedSet = new Set<string>(SUGGESTED_LANGUAGE_CODES);

function suggestedInOrder(): LanguageDef[] {
  const byCode = new Map(ALL_NO_AUTO.map((l) => [l.code, l]));
  return SUGGESTED_LANGUAGE_CODES.map((c) => byCode.get(c)).filter((x): x is LanguageDef => Boolean(x));
}

/** Remaining languages after suggested, A–Z. */
function allExceptSuggested(): LanguageDef[] {
  return ALL_NO_AUTO.filter((l) => !suggestedSet.has(l.code));
}

export const AUTO_DETECT: LanguageDef = { code: "AUTO", label: "Detect language" };

/** Source column: suggested → detect + all others A–Z. */
export function getSourceLanguageOptions(): { groups: { label: string; languages: LanguageDef[] }[] } {
  return {
    groups: [
      { label: "Suggested languages", languages: suggestedInOrder() },
      { label: "All languages", languages: [AUTO_DETECT, ...allExceptSuggested()] },
    ],
  };
}

/** Target column: no auto-detect. */
export function getTargetLanguageOptions(): { groups: { label: string; languages: LanguageDef[] }[] } {
  return {
    groups: [
      { label: "Suggested languages", languages: suggestedInOrder() },
      { label: "All languages", languages: allExceptSuggested() },
    ],
  };
}

/** Flat list for cases that need every speakable target code (e.g. validation). */
export const TARGET_LANGUAGES_FLAT: LanguageDef[] = [...suggestedInOrder(), ...allExceptSuggested()];

/** @deprecated Use getSourceLanguageOptions / getTargetLanguageOptions — kept for quick scripts */
export const LANGUAGES = TARGET_LANGUAGES_FLAT;

export const DOMAINS = [
  { id: "general", label: "General" },
  { id: "legal", label: "Legal" },
  { id: "marketing", label: "Marketing" },
  { id: "technical", label: "Technical" },
  { id: "casual", label: "Casual / social" },
  { id: "gaming", label: "Gaming" },
  { id: "ecommerce", label: "E‑commerce" },
];
