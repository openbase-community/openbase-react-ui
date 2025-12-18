import { ModelsRelationshipsView } from "@/components/ModelsRelationshipsView";
import { ModelsView } from "@/components/ModelsView";
import { ProjectLayout } from "@/components/ProjectLayout";
import { useQuery } from "@tanstack/react-query";
import { List, Share2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface Project {
  id: number;
  identifier: string;
  title: string;
  dev_server: {
    id: number;
    ec2_instance_id: string;
    subdomain: string;
    code_url: string;
    preview_url: string;
    status: "ready" | "terminating" | "terminated";
    created_at: string;
    last_used_at: string;
  } | null;
}

const ModelsPage = () => {
  const { appName, projectId } = useParams<{
    appName: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isRelationshipsView = location.pathname.includes("/relationships");

  // Fetch project data when projectId is present
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const response = await fetch(`/api/openbase/projects/${projectId}/`);
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      return response.json();
    },
    enabled: !!projectId,
  });

  const modelsSubSections = [
    { id: "list", label: "List", icon: List, path: "models" },
    {
      id: "relationships",
      label: "Relationships",
      icon: Share2,
      path: "models/relationships",
    },
  ];

  const handleModelsSubSectionChange = (sectionPath: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/${appName}/${sectionPath}`);
    } else {
      navigate(`/${appName}/${sectionPath}`);
    }
  };

  return (
    <ProjectLayout
      selectedSection="models"
      pageTitle={isRelationshipsView ? "Model Relationships" : "Models"}
      appName={appName}
      modelsSubSections={modelsSubSections}
      selectedModelsSubSection={isRelationshipsView ? "relationships" : "list"}
      onModelsSubSectionChange={handleModelsSubSectionChange}
    >
      {projectId && project?.dev_server && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Project:</strong> {project.title} |<strong> Server:</strong>{" "}
            {project.dev_server.status === "ready"
              ? "Running"
              : project.dev_server.status === "terminating"
              ? "Terminating"
              : "Terminated"}{" "}
            |<strong> Last used:</strong>{" "}
            {new Date(project.dev_server.last_used_at).toLocaleString()}
          </p>
        </div>
      )}
      {appName &&
        (isRelationshipsView ? (
          <ModelsRelationshipsView appName={appName} />
        ) : (
          <ModelsView appName={appName} />
        ))}
    </ProjectLayout>
  );
};

export default ModelsPage;
