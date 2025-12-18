import { useAgentChat } from "@/contexts/AgentChatContext";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Routes } from "react-router-dom";
import { AgentChatPanel } from "./AgentChatPanel";

interface ProjectRoutesWithChatProps {
  children: React.ReactNode;
}

export const ProjectRoutesWithChat = ({ children }: ProjectRoutesWithChatProps) => {
  const { isAgentChatVisible } = useAgentChat();

  return (
    <div className="fixed inset-0 flex">
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={isAgentChatVisible ? 75 : 100} minSize={50}>
          <div className="h-full overflow-auto">
            <Routes>
              {children}
            </Routes>
          </div>
        </Panel>
        {isAgentChatVisible && (
          <>
            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize" />
            <Panel defaultSize={25} minSize={15} maxSize={50}>
              <AgentChatPanel isVisible={true} />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};