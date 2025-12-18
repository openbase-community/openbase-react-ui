import React, { createContext, useContext, useState } from "react";

interface AgentChatContextType {
  isAgentChatVisible: boolean;
  setAgentChatVisible: (visible: boolean) => void;
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
  const [isAgentChatVisible, setAgentChatVisible] = useState(true);

  return (
    <AgentChatContext.Provider
      value={{ isAgentChatVisible, setAgentChatVisible }}
    >
      {children}
    </AgentChatContext.Provider>
  );
};