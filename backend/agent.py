from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import unicodedata

from backend.config import settings


PROFILE_ALIASES = (
    "flavio",
    "flavio junior",
    "flavio jr",
    "junior",
    "fjr",
)

PROFILE_KEYWORDS = (
    "perfil",
    "trajetoria",
    "historia",
    "profissao",
    "trabalho",
    "carreira",
    "faculdade",
    "curso",
    "estudos",
    "estuda",
    "sistemas",
    "tecnologia",
    "seguranca",
    "projetos",
    "aprendizado",
    "autodidata",
    "computacao",
    "desenvolvimento",
)

PROFILE_INTENT_PATTERNS = (
    r"\bquem e (o )?(flavio|flavio junior|flavio jr)\b",
    r"\bfale sobre (o )?(flavio|flavio junior|flavio jr)\b",
    r"\bconte sobre (o )?(flavio|flavio junior|flavio jr)\b",
    r"\bo que (ele|ela) faz\b",
    r"\bqual (e|eh) a profissao d(e|el)e\b",
    r"\bqual (e|eh) a trajetoria d(e|el)e\b",
    r"\bsobre (ele|ela|essa pessoa|flavio|flavio junior|flavio jr)\b",
)


@dataclass(frozen=True)
class AgentDecision:
    route: str
    matched_keywords: list[str]
    confidence: float


GENERIC_SYSTEM_PROMPT = """
Voce e um assistente util, claro e objetivo.
Responda sempre na mesma lingua do usuario.
Se nao souber algo, diga isso com naturalidade em vez de inventar fatos.
""".strip()


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", without_accents).strip().lower()


def load_profile_context() -> str:
    prompt_path: Path = settings.prompt_path
    return prompt_path.read_text(encoding="utf-8").strip()


def detect_agent_route(message: str) -> AgentDecision:
    normalized_message = _normalize(message)

    matched_aliases = [alias for alias in PROFILE_ALIASES if alias in normalized_message]
    matched_keywords = [keyword for keyword in PROFILE_KEYWORDS if keyword in normalized_message]
    matched_intents = [pattern for pattern in PROFILE_INTENT_PATTERNS if re.search(pattern, normalized_message)]

    confidence = 0.0
    if matched_aliases:
        confidence += 0.72
    if matched_keywords:
        confidence += min(0.12 * len(matched_keywords), 0.36)
    if matched_intents:
        confidence += 0.28

    route = "profile" if confidence >= 0.6 else "generic"
    if matched_aliases:
        route = "profile"

    if route == "profile":
        confidence = min(confidence, 0.98)
    else:
        confidence = min(confidence, 0.49)

    matched = sorted(set(matched_aliases + matched_keywords))
    return AgentDecision(route=route, matched_keywords=matched, confidence=round(confidence or 0.12, 2))


def build_system_prompt(route: str) -> str:
    if route != "profile":
        return GENERIC_SYSTEM_PROMPT

    profile_context = load_profile_context()
    return f"""
Voce e um agente especializado em responder perguntas sobre Flavio Junior.
Responda na mesma lingua do usuario.
Use prioritariamente o contexto abaixo.
Nao invente fatos, datas ou detalhes que nao estejam no contexto.
Se a pergunta for sobre Flavio Junior e a informacao nao estiver disponivel, diga isso com clareza.
Se a pergunta trouxer uma comparacao ou opiniao, voce pode responder de forma natural, mas sem contradizer o contexto.

Contexto sobre Flavio Junior:
{profile_context}
""".strip()
