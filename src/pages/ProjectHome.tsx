import { ProjectLayout } from "@/components/ProjectLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";

const ProjectHome = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <ProjectLayout
      selectedSection="home"
      pageTitle={`Project: ${projectId || "Unknown"}`}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {projectId}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This is the home page for your project. Select a Django app from
              the sidebar to start exploring its models, endpoints, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View and manage your Django models, their fields, and
                    relationships.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Explore API endpoints, test them, and view their
                    documentation.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage background tasks and view their execution status.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectLayout>
  );
};

export { ProjectHome };
