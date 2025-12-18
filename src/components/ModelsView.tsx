import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { getDisplayDocstring, getEmojiFromDocstring } from "@/lib/emoji-utils";
import { Code, Database, Eye, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { ModelField } from "./ModelField";

interface ModelMethod {
  name: string;
  docstring?: string;
  body?: string;
}

interface ModelProperty {
  name: string;
  docstring?: string;
  body: string;
}

interface SaveMethod {
  body: string;
  docstring?: string;
}

interface CustomField {
  name: string;
  type: string;
  kwargs?: Record<string, unknown>;
}

interface CreateMethod {
  body: string;
  docstring?: string;
}

interface ModelField {
  name: string;
  type: string;
  kwargs: Record<string, unknown>;
  choices?: [string, string][];
}

interface Model {
  name: string;
  lineno: number | null;
  end_lineno: number | null;
  docstring: string;
  fields: ModelField[];
  meta: Record<string, unknown>;
  methods: ModelMethod[];
  properties: ModelProperty[];
  save_method: SaveMethod | null;
  str_method: { body: string } | null;
}

interface Serializer {
  name: string;
  model: string;
  fields: string[];
  read_only_fields: string[];
  custom_fields: CustomField[];
  create_method: CreateMethod | null;
}

interface ModelsViewProps {
  appName: string;
}

export const ModelsView = ({ appName }: ModelsViewProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [serializers, setSerializers] = useState<Serializer[]>([]);
  const [djangoRoot, setDjangoRoot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();

  // Get the model to expand from query parameters
  const expandModel = searchParams.get("expand");

  const fetchData = useCallback(async () => {
    console.log("🔄 fetchData called for app:", appName);
    setLoading(true);
    const packageName = getPackageNameForApp(appName);

    if (!packageName) {
      console.error(`Package name not found for app: ${appName}`);
      toast.error("Error", {
        description: `Package name not found for app: ${appName}`,
      });
      setLoading(false);
      return;
    }

    try {
      const [modelsResponse, serializersResponse] = await Promise.all([
        fetch(
          `/api/openbase/projects/${projectId}/packages/${packageName}/apps/${appName}/models/`
        ),
        fetch(
          `/api/openbase/projects/${projectId}/packages/${packageName}/apps/${appName}/serializers/`
        ),
      ]);

      if (!modelsResponse.ok || !serializersResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const modelsData = await modelsResponse.json();
      const serializersData = await serializersResponse.json();

      const newModels = Array.isArray(modelsData)
        ? modelsData
        : modelsData.models || [];
      const newSerializers = Array.isArray(serializersData)
        ? serializersData
        : serializersData.serializers || [];
      const newDjangoRoot = Array.isArray(modelsData)
        ? ""
        : modelsData.django_root || "";

      console.log("📊 Fetched models data:", {
        modelsCount: newModels.length,
        serializersCount: newSerializers.length,
      });

      setModels(newModels);
      setSerializers(newSerializers);
      setDjangoRoot(newDjangoRoot);
    } catch (error) {
      console.error("Failed to fetch models data:", error);
      toast.error("Error", {
        description: "Failed to fetch models and serializers data",
      });
    } finally {
      setLoading(false);
    }
  }, [appName, projectId, getPackageNameForApp]);

  useEffect(() => {
    if (!isAppsLoading) {
      fetchData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, isAppsLoading]);

  // Scroll to expanded model when it's loaded
  useEffect(() => {
    if (expandModel && models.length > 0 && !loading) {
      // Small delay to ensure the accordion has expanded
      setTimeout(() => {
        const modelElement = modelRefs.current[expandModel];
        if (modelElement) {
          modelElement.scrollIntoView({
            behavior: "instant",
            block: "start",
            inline: "nearest",
          });
        }
      }, 100);
    }
  }, [expandModel, models, loading]);

  const getSerializersForField = (modelName: string, fieldName: string) => {
    return serializers.filter(
      (serializer) =>
        serializer.model === modelName &&
        (serializer.fields.includes(fieldName) ||
          serializer.custom_fields.some((cf) => cf.name === fieldName))
    );
  };

  const handleViewSource = (
    appName: string,
    modelName: string,
    lineNumber: number | null
  ) => {
    const modelFilePath = `${djangoRoot}/${appName}/models.py`;
    const cursorUrl = lineNumber
      ? `cursor://file/${modelFilePath}:${lineNumber}`
      : `cursor://file/${modelFilePath}`;
    window.open(cursorUrl, "_blank");
  };

  const handleViewInstances = (appName: string, modelName: string) => {
    navigate(
      `/projects/${projectId}/admin/${appName}/${modelName.toLowerCase()}?modelName=${encodeURIComponent(
        modelName
      )}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading models...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p>
        Models are tables in the database. They contain fields, which are
        columns in the table. Use Django models to store data in the backend
        API.
      </p>

      <Accordion type="multiple" className="space-y-4">
        {models.map((model) => {
          const emojiResult = getEmojiFromDocstring(model.docstring);
          const displayDocstring = getDisplayDocstring(model.docstring);

          return (
            <AccordionItem
              key={model.name}
              value={model.name}
              className="border rounded-lg px-6"
              ref={(el) => (modelRefs.current[model.name] = el)}
            >
              <Card className="border-0">
                <CardHeader className="w-full pb-3">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1">
                      <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>svg]:rotate-180">
                        <div className="text-left">
                          <CardTitle className="flex items-center gap-2">
                            {emojiResult ? (
                              <span className="text-lg">
                                {emojiResult.emoji}
                              </span>
                            ) : (
                              <Database className="h-5 w-5" />
                            )}
                            {model.name}
                          </CardTitle>
                          {displayDocstring && (
                            <p className="text-sm font-normal text-muted-foreground mt-2">
                              {displayDocstring}
                            </p>
                          )}
                        </div>
                      </AccordionTrigger>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleViewSource(appName, model.name, model.lineno)
                      }
                      className="flex items-center gap-1"
                    >
                      <Code className="h-3 w-3" />
                      Source
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInstances(appName, model.name)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Instances
                    </Button>
                  </div>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="space-y-6 pt-0">
                    {/* Fields Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Fields</h3>
                      <div className="space-y-4">
                        {model.fields.map((field) => {
                          const serializers = getSerializersForField(
                            model.name,
                            field.name
                          );
                          return (
                            <ModelField
                              key={field.name}
                              field={field}
                              serializers={serializers}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Properties Section */}
                    {model.properties.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          Properties
                        </h3>
                        <div className="space-y-3">
                          {model.properties.map((prop, index) => (
                            <div key={index} className="border rounded-lg p-3">
                              <h4 className="font-medium">{prop.name}</h4>
                              {prop.docstring && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {prop.docstring}
                                </p>
                              )}
                              <SyntaxHighlighter
                                language="python"
                                style={tomorrow}
                                className="text-xs rounded overflow-x-auto"
                              >
                                {prop.body}
                              </SyntaxHighlighter>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* String Method Section */}
                    {model.str_method && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">
                          String Representation
                        </h3>
                        <SyntaxHighlighter
                          language="python"
                          style={tomorrow}
                          className="text-sm rounded overflow-x-auto"
                        >
                          {model.str_method.body}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
