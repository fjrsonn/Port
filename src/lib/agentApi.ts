export type AgentRoute = 'profile' | 'generic';

export type AgentChatResponse = {
  answer: string;
  route: AgentRoute;
  matched_keywords: string[];
  confidence: number;
};

type AgentApiErrorPayload = {
  detail?: string;
};

export async function sendAgentMessage(message: string, signal?: AbortSignal): Promise<AgentChatResponse> {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = 'Nao foi possivel responder agora.';

    try {
      const payload = (await response.json()) as AgentApiErrorPayload;
      if (payload.detail) errorMessage = payload.detail;
    } catch {
      // Ignore JSON parsing failures and keep the default error message.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as AgentChatResponse;
}
