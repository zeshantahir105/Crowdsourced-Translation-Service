import logging
import os

import httpx

logger = logging.getLogger(__name__)

# Above this size, translate in chunks (documents / long pastes).
CHUNK_CHARS = int(os.getenv("TRANSLATE_CHUNK_CHARS", "7000"))
MAX_SINGLE_CHARS = int(os.getenv("TRANSLATE_MAX_SINGLE_CHARS", "12000"))

# DeepL free tier: api-free.deepl.com — paid: api.deepl.com
DEEPL_FREE_BASE = "https://api-free.deepl.com"
DEEPL_PRO_BASE = "https://api.deepl.com"


def _normalize_deepl_lang(code: str) -> str:
    """Map app codes to DeepL language codes where they differ."""
    c = (code or "").strip().upper()
    return {
        "PT": "PT-BR",
        "ZH": "ZH-HANS",
        "NB": "NB",  # Norwegian Bokmål
    }.get(c, c)


def _mock_translate(text: str, source: str, target: str, domain: str) -> str:
    return (
        "The translation service is not working properly right now. "
        "Configure OPENAI_API_KEY and/or DEEPL_API_KEY on the AI service to enable translation.\n\n"
        f"---\nDomain: {domain} | {source} → {target}\n\n{text[:2000]}"
    )


def _translate_deepl(text: str, source_lang: str, target_lang: str) -> str | None:
    key = os.getenv("DEEPL_API_KEY", "").strip()
    if not key:
        return None

    use_pro = os.getenv("DEEPL_USE_PRO", "").lower() in ("1", "true", "yes")
    base = os.getenv("DEEPL_API_BASE", "").rstrip("/")
    if not base:
        base = DEEPL_PRO_BASE if use_pro else DEEPL_FREE_BASE

    url = f"{base}/v2/translate"
    src_raw = (source_lang or "").strip().upper()
    src = _normalize_deepl_lang(source_lang)
    tgt = _normalize_deepl_lang(target_lang)

    data: dict[str, str] = {"text": text, "target_lang": tgt}
    # Omit source_lang for auto-detect (DeepL infers source when not sent).
    if src_raw and src_raw != "AUTO":
        data["source_lang"] = src

    try:
        # DeepL deprecated auth_key in body (Nov 2025); use Authorization header only.
        with httpx.Client(timeout=60.0) as client:
            r = client.post(
                url,
                data=data,
                headers={"Authorization": f"DeepL-Auth-Key {key}"},
            )
        if r.status_code != 200:
            logger.warning("DeepL HTTP %s: %s", r.status_code, r.text[:500])
            return None
        data = r.json()
        translations = data.get("translations") or []
        if not translations:
            return None
        out = (translations[0].get("text") or "").strip()
        return out or None
    except Exception as e:
        logger.warning("DeepL translation failed: %s", e)
        return None


def _translate_openai(text: str, source_lang: str, target_lang: str, domain: str) -> str | None:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        system = (
            "You are a professional translator for LingoHub AI. "
            "Preserve tone, register, and cultural nuance. "
            "Output only the translation, no explanations."
        )
        src = (source_lang or "").strip().upper()
        if src == "AUTO":
            user = (
                f"Domain/context: {domain}\n"
                f"Detect the source language from the text, then translate into {target_lang}. "
                f"Output only the translation, no explanations or notes.\n\n{text}"
            )
        else:
            user = (
                f"Domain/context: {domain}\n"
                f"Translate from {source_lang} to {target_lang}:\n\n{text}"
            )
        # Long chunks need enough headroom for verbose target languages.
        approx_out = max(512, int(len(text) * 1.25) + 256)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_tokens=min(8192, approx_out),
        )
        out = (resp.choices[0].message.content or "").strip()
        return out or None
    except Exception as e:
        logger.warning("OpenAI translation failed: %s", e)
        return None


def _split_for_translation(text: str, max_chunk: int) -> list[str]:
    """Split long text on paragraph/line boundaries when possible."""
    t = (text or "").strip()
    if not t:
        return []
    if len(t) <= max_chunk:
        return [t]
    chunks: list[str] = []
    i = 0
    n = len(t)
    while i < n:
        end = min(i + max_chunk, n)
        if end < n:
            segment = t[i:end]
            dbl = segment.rfind("\n\n")
            if dbl > max_chunk // 3:
                end = i + dbl + 2
            else:
                sgl = segment.rfind("\n")
                if sgl > max_chunk // 3:
                    end = i + sgl + 1
        piece = t[i:end].strip()
        if piece:
            chunks.append(piece)
        i = end
    return chunks


def _translate_single_pass(text: str, source_lang: str, target_lang: str, domain: str) -> str:
    """
    One API-sized segment. Order: OpenAI → DeepL → mock.
    """
    openai_out = _translate_openai(text, source_lang, target_lang, domain)
    if openai_out:
        return openai_out

    deepl_out = _translate_deepl(text, source_lang, target_lang)
    if deepl_out:
        return deepl_out

    return _mock_translate(text, source_lang, target_lang, domain)


def translate_with_llm(text: str, source_lang: str, target_lang: str, domain: str) -> str:
    """
    Translates arbitrary-length text (chunked for long documents).
    Order per chunk: OpenAI (if configured) → DeepL backup (if configured) → mock.
    """
    text = text or ""
    if not text.strip():
        return ""

    if len(text) <= MAX_SINGLE_CHARS:
        return _translate_single_pass(text, source_lang, target_lang, domain)

    parts = _split_for_translation(text, CHUNK_CHARS)
    if not parts:
        return ""
    if len(parts) == 1:
        return _translate_single_pass(parts[0], source_lang, target_lang, domain)

    out_parts: list[str] = []
    for p in parts:
        out_parts.append(_translate_single_pass(p, source_lang, target_lang, domain))
    return "\n\n".join(out_parts)
