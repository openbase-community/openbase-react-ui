import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChatMessage,
  ChatSession,
  useChatApi,
} from "../hooks/use-chat-api";

interface AgentChatContextType {
  // Visibility
  isAgentChatVisible: boolean;
  setAgentChatVisible: (visible: boolean) => void;

  // Session management
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoadingSessions: boolean;
  createNewSession: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;

  // Messages
  messages: ChatMessage[];
  isLoadingMessages: boolean;

  // Sending messages
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  streamingContent: string;
  abortMessage: () => Promise<void>;

  // Error handling
  error: string | null;
  clearError: () => void;
}

const AgentChatContext = createContext<AgentChatContextType | undefined>(
  undefined
);

export const useAgentChat = () => {
  const context = useContext(AgentChatContext);
  if (context === undefined) {
    throw new Error("useAgentChat must be used within an AgentChatProvider");
  }
  return context;
};

interface AgentChatProviderProps {
  children: React.ReactNode;
}

export const AgentChatProvider: React.FC<AgentChatProviderProps> = ({
  children,
}) => {
  const {
    createSession,
    getSession,
    listSessions,
    getMessages,
    sendToClaude,
    abortClaude,
  } = useChatApi();

  // Visibility state
  const [isAgentChatVisible, setAgentChatVisible] = useState(true);

  // Session state
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  // Load sessions on mount
  const refreshSessions: () => Promise<void> = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const loadedSessions = await listSessions();
      setSessions(loadedSessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setIsLoadingSessions(false);
    }
  }, [listSessions]);

  // Initial load - only run once
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadInitial = async () => {
      setIsLoadingSessions(true);
      try {
        const loadedSessions = await listSessions();
        setSessions(loadedSessions);

        // Select the most recent session if available
        if (loadedSessions.length > 0) {
          setCurrentSession(loadedSessions[0]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadInitial();
  }, [listSessions]);

  // Load messages when session changes
  useEffect(() => {
    if (!currentSession) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const loadedMessages = await getMessages(currentSession.id);
        if (!cancelled) {
          setMessages(loadedMessages);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load messages");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [currentSession?.id, getMessages]);

  const createNewSession = useCallback(async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    }
  }, [createSession]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
      } else {
        try {
          const loadedSession = await getSession(sessionId);
          setCurrentSession(loadedSession);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load session");
        }
      }
    },
    [sessions, getSession]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      let sessionId = currentSession?.id;

      // Create a new session if we don't have one
      if (!sessionId) {
        try {
          const newSession = await createSession();
          setSessions((prev) => [newSession, ...prev]);
          setCurrentSession(newSession);
          sessionId = newSession.id;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to create session");
          return;
        }
      }

      setIsStreaming(true);
      setStreamingContent("");
      setError(null);

      try {
        await sendToClaude(sessionId, content, {
          onUserMessage: (message) => {
            setMessages((prev) => [...prev, message]);
          },
          onResponseChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onErrorChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          onCompletion: (assistantMessage) => {
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent("");
            setIsStreaming(false);
          },
          onError: (errorMessage) => {
            setError(errorMessage);
            setIsStreaming(false);
            setStreamingContent("");
          },
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          // Request was aborted, not an error
          setIsStreaming(false);
          setStreamingContent("");
        } else {
          setError(e instanceof Error ? e.message : "Failed to send message");
          setIsStreaming(false);
          setStreamingContent("");
        }
      }
    },
    [currentSession?.id, createSession, sendToClaude]
  );

  const abortMessage = useCallback(async () => {
    try {
      await abortClaude();
      setIsStreaming(false);
      setStreamingContent((prev) => {
        if (prev) {
          const partialMessage: ChatMessage = {
            id: `partial-${Date.now()}`,
            session_id: currentSession?.id || "",
            content: prev + "\n\n[Response aborted]",
            role: "assistant",
            metadata: { aborted: true },
            claude_response: {},
            created_at: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, partialMessage]);
        }
        return "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to abort");
    }
  }, [abortClaude, currentSession?.id]);

  return (
    <AgentChatContext.Provider
      value={{
        isAgentChatVisible,
        setAgentChatVisible,
        currentSession,
        sessions,
        isLoadingSessions,
        createNewSession,
        switchSession,
        refreshSessions,
        messages,
        isLoadingMessages,
        sendMessage,
        isStreaming,
        streamingContent,
        abortMessage,
        error,
        clearError,
      }}
    >
      {children}
    </AgentChatContext.Provider>
  );
};
