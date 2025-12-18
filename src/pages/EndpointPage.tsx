import { ProjectLayout } from "@/components/ProjectLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const EndpointPage = () => {
  const { appName } = useParams<{
    appName: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get the endpoint prefix and API prefix from query params
  const endpointPrefix = searchParams.get("prefix");
  const apiPrefix = searchParams.get("apiPrefix") || "/api";

  if (!appName || !endpointPrefix) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Invalid app name or endpoint prefix provided.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const endpointUrl = `http://localhost:8000/${
    apiPrefix.startsWith("/") ? apiPrefix.slice(1) : apiPrefix
  }/${endpointPrefix}/`;

  return (
    <ProjectLayout
      selectedSection="endpoints"
      pageTitle={`${appName} - ${endpointPrefix} API`}
      appName={appName}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            API endpoint for the {endpointPrefix} resource. This endpoint is
            available at {endpointUrl} and provides REST API functionality for
            your application.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${appName}/endpoints`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Endpoints
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden">
          <iframe
            src={endpointUrl}
            className="w-full h-[calc(100vh-200px)]"
            title={`API Endpoint - ${appName} ${endpointPrefix}`}
          />
        </div>
      </div>
    </ProjectLayout>
  );
};

export { EndpointPage };
