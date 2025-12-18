import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { toast } from "@/hooks/use-toast";
import { buildAppApiUrl } from "@/lib/api-utils";
import { Code, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Serializer {
  name: string;
  model: string;
  fields: string[];
  read_only_fields: string[];
  custom_fields: any[];
  create_method: any;
}

interface SerializersViewProps {
  appName: string;
}

export const SerializersView = ({ appName }: SerializersViewProps) => {
  const [serializers, setSerializers] = useState<Serializer[]>([]);
  const [loading, setLoading] = useState(true);
  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();

  useEffect(() => {
    if (!isAppsLoading) {
      fetchSerializers();
    }
  }, [appName, isAppsLoading]);

  const fetchSerializers = async () => {
    setLoading(true);
    const packageName = getPackageNameForApp(appName);
    
    if (!packageName) {
      console.error(`Package name not found for app: ${appName}`);
      toast({
        title: "Error",
        description: `Package name not found for app: ${appName}`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, "serializers/")
      );

      if (!response.ok) {
        throw new Error("Failed to fetch serializers");
      }

      const data = await response.json();
      setSerializers(Array.isArray(data) ? data : (data.serializers || []));
    } catch (error) {
      console.error("Failed to fetch serializers data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch serializers data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatKwargs = (kwargs: Record<string, any>) => {
    return Object.entries(kwargs)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading serializers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Code className="h-5 w-5" />
          Serializers
        </h3>
        <div className="grid gap-4">
          {serializers.map((serializer) => (
            <Card key={serializer.name}>
              <CardHeader>
                <CardTitle>{serializer.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Model: {serializer.model}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {serializer.fields.map((field) => (
                        <Badge key={field} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {serializer.read_only_fields.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Read-only Fields</h4>
                      <div className="flex flex-wrap gap-1">
                        {serializer.read_only_fields.map((field) => (
                          <Badge key={field} variant="outline">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {serializer.custom_fields.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Custom Fields</h4>
                      <div className="space-y-2">
                        {serializer.custom_fields.map((field, index) => (
                          <div
                            key={index}
                            className="text-sm bg-muted p-2 rounded"
                          >
                            <strong>{field.name}</strong>:{" "}
                            {field.serializer_class}
                            {field.arguments &&
                              Object.keys(field.arguments).length > 0 && (
                                <span className="ml-2 text-muted-foreground">
                                  ({formatKwargs(field.arguments)})
                                </span>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
