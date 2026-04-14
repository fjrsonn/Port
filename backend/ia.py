from __future__ import annotations

from dataclasses import dataclass

from openai import OpenAI

from backend.config import settings


@dataclass(frozen=True)
class ProviderRuntime:
    provider: str
    label: str
    api_key: str
    model: str
    base_url: str


_clients: dict[str, OpenAI] = {}


def _get_runtime() -> ProviderRuntime:
    if settings.llm_provider == "groq":
        # Backward compatibility: some previous local setups stored the Groq key in XAI_API_KEY.
        api_key = settings.groq_api_key or settings.xai_api_key
        if not api_key:
            raise RuntimeError(
                "Nenhuma chave da Groq foi encontrada. Adicione GROQ_API_KEY ao arquivo .env "
                "ou mantenha a chave gsk existente em XAI_API_KEY temporariamente para compatibilidade."
            )

        return ProviderRuntime(
            provider="groq",
            label="Groq",
            api_key=api_key,
            model=settings.groq_model,
            base_url=settings.groq_base_url,
        )

    if settings.llm_provider == "xai":
        # Backward compatibility: older project versions stored the Grok key in OPENAI_API_KEY.
        api_key = settings.xai_api_key or settings.openai_api_key
        if not api_key:
            raise RuntimeError(
                "Nenhuma chave da xAI/Grok foi encontrada. Adicione XAI_API_KEY ao arquivo .env "
                "ou mantenha OPENAI_API_KEY temporariamente para compatibilidade."
            )

        return ProviderRuntime(
            provider="xai",
            label="Grok/xAI",
            api_key=api_key,
            model=settings.xai_model,
            base_url=settings.xai_base_url,
        )

    if settings.llm_provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError(
                "A variavel OPENAI_API_KEY nao foi encontrada. Adicione a chave no arquivo .env antes de usar o agente."
            )

        return ProviderRuntime(
            provider="openai",
            label="OpenAI",
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            base_url=settings.openai_base_url,
        )

    raise RuntimeError("O valor de LLM_PROVIDER e invalido. Use 'groq', 'xai' ou 'openai'.")


def _get_client(runtime: ProviderRuntime) -> OpenAI:
    client = _clients.get(runtime.provider)
    if client is not None:
        return client

    client = OpenAI(
        api_key=runtime.api_key,
        base_url=runtime.base_url,
        timeout=settings.request_timeout_seconds,
    )
    _clients[runtime.provider] = client
    return client


def generate_answer(user_message: str, system_prompt: str) -> str:
    runtime = _get_runtime()
    client = _get_client(runtime)

    if runtime.provider == "xai":
        response = client.responses.create(
            model=runtime.model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_output_tokens=settings.max_output_tokens,
        )
    else:
        response = client.responses.create(
            model=runtime.model,
            instructions=system_prompt,
            input=user_message,
            max_output_tokens=settings.max_output_tokens,
        )

    answer = (response.output_text or "").strip()
    if not answer:
        raise RuntimeError(f"O modelo configurado em {runtime.label} nao retornou texto suficiente para montar a resposta.")

    return answer
