from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _load_dotenv_files() -> None:
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent

    for env_path in (backend_dir / ".env", project_root / ".env"):
        if env_path.exists():
            load_dotenv(env_path, override=False)


def _split_csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


def _get_first_env(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value.strip():
            return value.strip()
    return default


def _normalize_provider(value: str) -> str:
    normalized = value.strip().lower()
    if normalized == "groq":
        return "groq"
    if normalized in {"xai", "grok"}:
        return "xai"
    if normalized == "openai":
        return "openai"
    return "groq"


@dataclass(frozen=True)
class Settings:
    project_root: Path
    backend_dir: Path
    prompt_path: Path
    llm_provider: str
    groq_api_key: str
    groq_model: str
    groq_base_url: str
    xai_api_key: str
    xai_model: str
    xai_base_url: str
    openai_api_key: str
    openai_model: str
    openai_base_url: str
    request_timeout_seconds: float
    max_output_tokens: int
    cors_origins: tuple[str, ...]


def load_settings() -> Settings:
    _load_dotenv_files()

    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent

    return Settings(
        project_root=project_root,
        backend_dir=backend_dir,
        prompt_path=backend_dir / "prompt.txt",
        llm_provider=_normalize_provider(os.getenv("LLM_PROVIDER", "groq")),
        groq_api_key=_get_first_env("GROQ_API_KEY"),
        groq_model=_get_first_env("GROQ_MODEL", default="openai/gpt-oss-20b"),
        groq_base_url=_get_first_env("GROQ_BASE_URL", default="https://api.groq.com/openai/v1"),
        xai_api_key=_get_first_env("XAI_API_KEY", "GROK_API_KEY"),
        xai_model=_get_first_env("XAI_MODEL", "GROK_MODEL", default="grok-4-fast-reasoning"),
        xai_base_url=_get_first_env("XAI_BASE_URL", "GROK_BASE_URL", default="https://api.x.ai/v1"),
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5-mini").strip(),
        openai_base_url=_get_first_env("OPENAI_BASE_URL", default="https://api.openai.com/v1"),
        request_timeout_seconds=float(
            _get_first_env(
                "LLM_TIMEOUT_SECONDS",
                "GROQ_TIMEOUT_SECONDS",
                "XAI_TIMEOUT_SECONDS",
                "OPENAI_TIMEOUT_SECONDS",
                default="20",
            )
        ),
        max_output_tokens=int(
            _get_first_env(
                "LLM_MAX_OUTPUT_TOKENS",
                "GROQ_MAX_OUTPUT_TOKENS",
                "XAI_MAX_OUTPUT_TOKENS",
                "OPENAI_MAX_OUTPUT_TOKENS",
                default="700",
            )
        ),
        cors_origins=_split_csv(
            os.getenv(
                "BACKEND_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        ),
    )


settings = load_settings()
