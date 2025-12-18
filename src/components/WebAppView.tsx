import { useProject } from "@/contexts/ProjectContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface WebAppViewProps {
  appName?: string;
}

interface DevServerData {
  preview_url: string;
}

interface ProjectData {
  dev_server: DevServerData;
}

export const WebAppView = ({ appName }: WebAppViewProps) => {
  const { projectId } = useProject();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      "WebAppView useEffect - appName:",
      appName,
      "projectId:",
      projectId
    );

    if (projectId) {
      console.log(
        "WebAppView - fetching project data for projectId:",
        projectId
      );
      fetchProjectPreviewUrl();
    } else {
      console.log("WebAppView - no projectId, using localhost");
      setPreviewUrl("http://localhost");
    }
  }, [projectId]);

  const fetchProjectPreviewUrl = async () => {
    if (!projectId) return;

    const apiUrl = `/api/openbase/projects/${projectId}/`;
    console.log("WebAppView - fetching from URL:", apiUrl);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      console.log("WebAppView - response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ProjectData = await response.json();
      console.log("WebAppView - received data:", data);

      if (data.dev_server && data.dev_server.preview_url) {
        console.log(
          "WebAppView - setting preview URL:",
          data.dev_server.preview_url
        );
        setPreviewUrl(data.dev_server.preview_url);
      } else {
        console.log(
          "WebAppView - no preview_url found in data.dev_server:",
          data.dev_server
        );
        throw new Error("Preview URL not found in dev_server data");
      }
    } catch (error) {
      console.error("WebAppView - failed to fetch project preview URL:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch preview URL"
      );
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // Log the current state
  console.log(
    "WebAppView - current state - previewUrl:",
    previewUrl,
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
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load preview</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-muted-foreground">No preview URL available</p>
        </div>
      </div>
    );
  }

  console.log("WebAppView - rendering iframe with URL:", previewUrl);
  return (
    <div className="w-full h-full">
      <iframe
        src={previewUrl}
        className="w-full h-full min-h-[calc(100vh-12rem)] border-0 shadow-lg"
        title="Web Application Preview"
      />
    </div>
  );
};
