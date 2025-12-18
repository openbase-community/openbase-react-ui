import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Loader2,
  MessageSquarePlus,
  Send,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AgentChatPanelProps {
  isVisible: boolean;
}

const MessageBubble = ({
  content,
  role,
  isStreaming = false,
}: {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
}) => {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900 border border-gray-200"
        )}
      >
        <pre className="whitespace-pre-wrap font-sans break-words">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
          )}
        </pre>
      </div>
    </div>
  );
};

export const AgentChatPanel = ({ isVisible }: AgentChatPanelProps) => {
  const {
    setAgentChatVisible,
    currentSession,
    sessions,
    isLoadingSessions,
    createNewSession,
    switchSession,
    messages,
    isLoadingMessages,
    sendMessage,
    isStreaming,
    streamingContent,
    abortMessage,
    error,
    clearError,
  } = useAgentChat();

  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, streamingContent]);

  // Focus textarea when panel becomes visible
  useEffect(() => {
    if (isVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isVisible]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const message = inputValue;
    setInputValue("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="h-full border-l border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Agent Chat
          </h3>

          {/* Session selector */}
          <Select
            value={currentSession?.id || ""}
            onValueChange={switchSession}
            disabled={isLoadingSessions}
          >
            <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
              <SelectValue placeholder="Select session..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-gray-500">
                  No sessions yet
                </div>
              ) : (
                sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name || `Session ${session.id.slice(0, 8)}`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* New session button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={createNewSession}
            title="New session"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setAgentChatVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs text-red-700 flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={clearError}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <MessageSquarePlus className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Start a conversation with Claude</p>
            <p className="text-xs mt-1 opacity-75">
              Ask questions about your codebase or request changes
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                role={message.role}
              />
            ))}

            {/* Streaming response */}
            {isStreaming && streamingContent && (
              <MessageBubble
                content={streamingContent}
                role="assistant"
                isStreaming
              />
            )}

            {/* Loading indicator when waiting for first chunk */}
            {isStreaming && !streamingContent && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            className="min-h-[60px] max-h-[150px] resize-none text-sm"
            disabled={isStreaming}
          />
          <div className="flex flex-col gap-1">
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                className="h-[60px] w-10"
                onClick={abortMessage}
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                className="h-[60px] w-10"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
