import { ModelsRelationshipsView } from "@/components/ModelsRelationshipsView";
import { ModelsView } from "@/components/ModelsView";
import { ProjectLayout } from "@/components/ProjectLayout";
import { List, Share2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const ModelsPage = () => {
  const { appName, projectId } = useParams<{
    appName: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isRelationshipsView = location.pathname.includes("/relationships");

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
      {appName &&
        (isRelationshipsView ? (
          <ModelsRelationshipsView appName={appName} />
        ) : (
          <ModelsView appName={appName} />
        ))}
    </ProjectLayout>
  );
};

export { ModelsPage };
