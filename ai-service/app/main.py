import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load ai-service/.env (uvicorn does not do this automatically)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from pydantic import BaseModel, Field

from app.translate import translate_with_llm

app = FastAPI(title="LingoHub AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DraftBody(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    source_lang: str
    target_lang: str
    domain: str = "general"


@app.get("/health")
def health():
    return {"ok": True, "service": "lingohub-ai"}


@app.post("/translate/draft")
def draft(
    body: DraftBody,
    x_service_secret: str | None = Header(default=None, alias="X-Service-Secret"),
):
    expected = os.getenv("SERVICE_SECRET") or ""
    if expected and x_service_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid service secret")

    out = translate_with_llm(
        body.text,
        body.source_lang,
        body.target_lang,
        body.domain,
    )
    return {"translated_text": out}
