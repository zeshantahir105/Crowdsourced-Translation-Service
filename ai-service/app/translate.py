import logging
import os

import httpx

logger = logging.getLogger(__name__)

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
        f"[No translation provider — set OPENAI_API_KEY and/or DEEPL_API_KEY]\n"
        f"Domain: {domain} | {source} → {target}\n\n{text[:2000]}"
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
    src = _normalize_deepl_lang(source_lang)
    tgt = _normalize_deepl_lang(target_lang)

    try:
        # DeepL deprecated auth_key in body (Nov 2025); use Authorization header only.
        with httpx.Client(timeout=60.0) as client:
            r = client.post(
                url,
                data={
                    "text": text,
                    "source_lang": src,
                    "target_lang": tgt,
                },
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
        user = (
            f"Domain/context: {domain}\n"
            f"Translate from {source_lang} to {target_lang}:\n\n{text}"
        )
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_tokens=min(4096, max(256, len(text) // 2 + 256)),
        )
        out = (resp.choices[0].message.content or "").strip()
        return out or None
    except Exception as e:
        logger.warning("OpenAI translation failed: %s", e)
        return None


def translate_with_llm(text: str, source_lang: str, target_lang: str, domain: str) -> str:
    """
    Order: OpenAI (if configured) → DeepL backup (if configured) → mock.
    Domain/tone hints apply to OpenAI only; DeepL is plain MT.
    """
    openai_out = _translate_openai(text, source_lang, target_lang, domain)
    if openai_out:
        return openai_out

    deepl_out = _translate_deepl(text, source_lang, target_lang)
    if deepl_out:
        return deepl_out

    return _mock_translate(text, source_lang, target_lang, domain)
