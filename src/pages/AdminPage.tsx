import { ProjectLayout } from "@/components/ProjectLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { ArrowLeft, List, Share2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const AdminPage = () => {
  const { appName, modelName } = useParams<{
    appName: string;
    modelName: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectId } = useProject();

  // Get the actual model name with correct capitalization from query params
  const actualModelName = searchParams.get("modelName") || modelName;

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
    navigate(`/${appName}/${sectionPath}`);
  };

  if (!appName || !modelName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Invalid app or model name provided.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminUrl = `http://localhost:8000/admin/${appName}/${modelName}/`;

  return (
    <ProjectLayout
      selectedSection="models"
      pageTitle={`${appName}.${actualModelName} Instances`}
      appName={appName}
      modelsSubSections={modelsSubSections}
      selectedModelsSubSection="list" // Keep list selected as admin is part of the list view
      onModelsSubSectionChange={handleModelsSubSectionChange}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage instances of the {actualModelName} model. The page below is
            the Django admin interface and is available in your production
            environment as well.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                `/projects/${projectId}/${appName}/models?expand=${encodeURIComponent(
                  actualModelName
                )}`
              )
            }
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {actualModelName}
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden">
          <iframe
            src={adminUrl}
            className="w-full h-[calc(100vh-200px)]"
            title={`Django Admin - ${appName} ${modelName}`}
          />
        </div>
      </div>
    </ProjectLayout>
  );
};

export default AdminPage;
