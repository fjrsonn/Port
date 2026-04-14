from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import APIConnectionError, APIStatusError, AuthenticationError, RateLimitError

from backend.agente import build_system_prompt, detect_agent_route
from backend.config import settings
from backend.ia import generate_answer
from backend.schemas import ChatRequest, ChatResponse


app = FastAPI(title="Port Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/agent/chat", response_model=ChatResponse)
def chat_with_agent(payload: ChatRequest) -> ChatResponse:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Digite uma pergunta antes de enviar.")

    decision = detect_agent_route(message)

    try:
        system_prompt = build_system_prompt(decision.route)
        answer = generate_answer(message, system_prompt)
    except FileNotFoundError as error:
        raise HTTPException(status_code=500, detail="O arquivo prompt.txt nao foi encontrado.") from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except AuthenticationError as error:
        raise HTTPException(
            status_code=502,
            detail="Falha de autenticacao com o provedor de IA. Verifique a chave configurada no arquivo .env.",
        ) from error
    except RateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail="O provedor de IA atingiu o limite de requisicoes ou consumo no momento. Tente novamente em instantes.",
        ) from error
    except APIConnectionError as error:
        raise HTTPException(
            status_code=502,
            detail="Nao foi possivel conectar ao provedor de IA agora. Verifique a conexao de rede e tente novamente.",
        ) from error
    except APIStatusError as error:
        raise HTTPException(
            status_code=502,
            detail=f"O provedor de IA retornou um erro inesperado (status {error.status_code}).",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail="O agente nao conseguiu responder agora. Tente novamente em instantes.",
        ) from error

    return ChatResponse(
        answer=answer,
        route=decision.route,
        matched_keywords=decision.matched_keywords,
        confidence=decision.confidence,
    )
