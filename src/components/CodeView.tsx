import { useProject } from "@/contexts/ProjectContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CodeViewProps {
  appName?: string;
}

interface DevServerData {
  code_url: string;
}

interface ProjectData {
  dev_server: DevServerData;
}

export const CodeView = ({ appName }: CodeViewProps) => {
  const { projectId } = useProject();
  const [codeUrl, setCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      "CodeView useEffect - appName:",
      appName,
      "projectId:",
      projectId
    );

    if (projectId) {
      console.log("CodeView - fetching project data for projectId:", projectId);
      fetchProjectCodeUrl();
    } else {
      console.log("CodeView - no projectId, using localhost");
      setCodeUrl("http://localhost");
    }
  }, [projectId]);

  const fetchProjectCodeUrl = async () => {
    if (!projectId) return;

    const apiUrl = `api/openbase/projects/${projectId}/`;
    console.log("CodeView - fetching from URL:", apiUrl);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      console.log("CodeView - response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ProjectData = await response.json();
      console.log("CodeView - received data:", data);

      if (data.dev_server && data.dev_server.code_url) {
        console.log("CodeView - setting code URL:", data.dev_server.code_url);
        setCodeUrl(data.dev_server.code_url);
      } else {
        console.log(
          "CodeView - no code_url found in data.dev_server:",
          data.dev_server
        );
        throw new Error("Code URL not found in dev_server data");
      }
    } catch (error) {
      console.error("CodeView - failed to fetch project code URL:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch code URL"
      );
      setCodeUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // Log the current state
  console.log(
    "CodeView - current state - codeUrl:",
    codeUrl,
    "loading:",
    loading,
    "error:",
    error
  );

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading code editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load code editor</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!codeUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-muted-foreground">No code URL available</p>
        </div>
      </div>
    );
  }

  console.log("CodeView - rendering iframe with URL:", codeUrl);
  return (
    <div className="w-full h-full">
      <iframe
        src={codeUrl}
        className="w-full h-full min-h-[calc(100vh-12rem)] border-0"
        title="Code Editor"
      />
    </div>
  );
};
