import React, { createContext, useContext } from "react";
import { useParams } from "react-router-dom";

interface ProjectContextType {
  projectId: string | null;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
}) => {
  const { projectId } = useParams<{ projectId: string }>();

  const contextValue: ProjectContextType = {
    projectId: projectId || null,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};
