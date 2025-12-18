import { useCallback, useRef } from "react";

export interface ChatSession {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  content: string;
  role: "user" | "assistant" | "system";
  metadata: Record<string, unknown>;
  claude_response: Record<string, unknown>;
  created_at: string;
}

interface SSEEvent {
  type:
    | "user_message"
    | "response_chunk"
    | "error_chunk"
    | "completion"
    | "error"
    | "keepalive";
  data: unknown;
}

interface SendToClaudeCallbacks {
  onUserMessage?: (message: ChatMessage) => void;
  onResponseChunk?: (chunk: string) => void;
  onErrorChunk?: (chunk: string) => void;
  onCompletion?: (assistantMessage: ChatMessage) => void;
  onError?: (error: string) => void;
}

const API_BASE = "/api/coder";

export const useChatApi = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const createSession = useCallback(
    async (name?: string): Promise<ChatSession> => {
      const response = await fetch(`${API_BASE}/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name || "", metadata: {} }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      return response.json();
    },
    []
  );

  const getSession = useCallback(async (sessionId: string): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/`);

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }, []);

  const listSessions = useCallback(async (): Promise<ChatSession[]> => {
    const response = await fetch(`${API_BASE}/sessions/`);

    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.statusText}`);
    }

    return response.json();
  }, []);

  const getMessages = useCallback(
    async (sessionId: string): Promise<ChatMessage[]> => {
      const response = await fetch(
        `${API_BASE}/messages/?session_id=${sessionId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.statusText}`);
      }

      const messages = await response.json();
      return messages.filter(
        (m: ChatMessage) => m.session_id === sessionId
      );
    },
    []
  );

  const sendToClaude = useCallback(
    async (
      sessionId: string,
      content: string,
      callbacks: SendToClaudeCallbacks
    ): Promise<void> => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/send-to-claude/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          content,
          role: "user",
          metadata: {},
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              try {
                const event: SSEEvent = JSON.parse(jsonStr);

                switch (event.type) {
                  case "user_message":
                    callbacks.onUserMessage?.(event.data as ChatMessage);
                    break;
                  case "response_chunk":
                    callbacks.onResponseChunk?.(event.data as string);
                    break;
                  case "error_chunk":
                    callbacks.onErrorChunk?.(event.data as string);
                    break;
                  case "completion": {
                    const completionData = event.data as {
                      assistant_response: ChatMessage;
                    };
                    callbacks.onCompletion?.(completionData.assistant_response);
                    break;
                  }
                  case "error": {
                    const errorData = event.data as { error: string };
                    callbacks.onError?.(errorData.error);
                    break;
                  }
                  case "keepalive":
                    // Ignore keepalive events
                    break;
                }
              } catch (e) {
                console.error("Failed to parse SSE event:", e, jsonStr);
              }
            }
          }
        }
      }
    },
    []
  );

  const abortClaude = useCallback(async (): Promise<void> => {
    // Abort the SSE connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Also call the abort endpoint
    await fetch(`${API_BASE}/abort-claude-commands/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }, []);

  const getGitDiff = useCallback(async () => {
    const response = await fetch(`${API_BASE}/git/diff/`);
    if (!response.ok) {
      throw new Error(`Failed to get git diff: ${response.statusText}`);
    }
    return response.json();
  }, []);

  const getRecentCommits = useCallback(async () => {
    const response = await fetch(`${API_BASE}/git/recent-commits/`);
    if (!response.ok) {
      throw new Error(`Failed to get recent commits: ${response.statusText}`);
    }
    return response.json();
  }, []);

  return {
    createSession,
    getSession,
    listSessions,
    getMessages,
    sendToClaude,
    abortClaude,
    getGitDiff,
    getRecentCommits,
  };
};
