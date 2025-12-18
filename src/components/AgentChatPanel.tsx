import { Button } from "@/components/ui/button";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface AgentChatPanelProps {
  isVisible: boolean;
}

export const AgentChatPanel = ({ isVisible }: AgentChatPanelProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { setAgentChatVisible } = useAgentChat();

  // Keep iframe mounted but hidden to preserve state
  useEffect(() => {
    if (iframeRef.current) {
      // Never change display - keep it always rendered
      iframeRef.current.style.visibility = isVisible ? "visible" : "hidden";
    }
  }, [isVisible]);

  return (
    <aside className="h-full border-l border-gray-200 bg-gray-50/50 flex flex-col">
      <div className="border-b border-gray-200 bg-gray-100 px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Agent Chat
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setAgentChatVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <iframe
          ref={iframeRef}
          src="http://localhost:7681"
          className="w-full h-full border-0 absolute inset-0"
          title="Agent Chat"
        />
      </div>
    </aside>
  );
};
