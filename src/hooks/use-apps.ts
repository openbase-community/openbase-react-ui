import { useProject } from "@/contexts/ProjectContext";
import { useQuery } from "@tanstack/react-query";

interface AppInfo {
  name: string;
  path: string;
  package_name: string;
}

export const useApps = () => {
  const { projectId } = useProject();

  const { data: apps = [], isLoading, error } = useQuery<AppInfo[]>({
    queryKey: ["apps", projectId],
    queryFn: async () => {
      const url = projectId
        ? `/api/openbase/projects/${projectId}/apps/`
        : "/api/openbase/apps/";
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000, // Consider data stale after 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  const getPackageNameForApp = (appName: string): string | undefined => {
    const app = apps.find(a => a.name === appName);
    return app?.package_name;
  };

  return {
    apps,
    isLoading,
    error,
    getPackageNameForApp,
  };
};