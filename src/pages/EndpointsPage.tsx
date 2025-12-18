import { ProjectLayout } from "@/components/ProjectLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { toast } from "sonner";
import { buildAppApiUrl } from "@/lib/api-utils";
import { Code2, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface UrlPattern {
  name: string;
  route: string;
  view_name: string;
  view_type: string;
}

interface RouterRegistration {
  prefix: string;
  viewset: string;
}

interface ViewSet {
  name: string;
  lineno: number | null;
  end_lineno: number | null;
  docstring: string;
  serializer_class: string;
  permission_classes: string[];
  lookup_field: string | null;
  lookup_url_kwarg: string | null;
  queryset_definition: string | null;
  methods: Array<{
    name: string;
    lineno: number | null;
    end_lineno: number | null;
    body: string;
    docstring: string | null;
  }>;
  actions: Array<{
    name: string;
    lineno: number | null;
    end_lineno: number | null;
    body: string;
    docstring: string;
    decorator_args: Record<string, string | boolean | string[]>;
  }>;
}

interface EndpointsData {
  urlpatterns: UrlPattern[];
  router_registrations: RouterRegistration[];
}

interface ViewsData {
  viewsets: ViewSet[];
  django_root: string;
}

const EndpointsPage = () => {
  const { appName } = useParams<{ appName: string }>();
  const [endpointsData, setEndpointsData] = useState<EndpointsData | null>(
    null
  );
  const [viewsData, setViewsData] = useState<ViewsData | null>(null);
  const [apiPrefix, setApiPrefix] = useState<string>("/api");
  const [djangoRoot, setDjangoRoot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();

  useEffect(() => {
    if (appName && !isAppsLoading) {
      fetchData();
    }
  }, [appName, isAppsLoading]);

  const fetchData = async () => {
    if (!appName || !projectId) return;

    const packageName = getPackageNameForApp(appName);
    if (!packageName) {
      console.error(`Package name not found for app: ${appName}`);
      toast.error("Error", {
        description: `Package name not found for app: ${appName}`,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const urlsUrl = buildAppApiUrl(projectId, packageName, appName, "urls/");
      const viewsUrl = buildAppApiUrl(projectId, packageName, appName, "views/");
      const prefixUrl = buildAppApiUrl(projectId, packageName, appName, "api-prefix/");
      
      console.log("Fetching URLs from:", urlsUrl);
      console.log("Fetching views from:", viewsUrl);
      console.log("Fetching prefix from:", prefixUrl);
      
      // Fetch URLs endpoint (required)
      const endpointsResponse = await fetch(urlsUrl);
      if (!endpointsResponse.ok) {
        console.error("URLs endpoint failed:", endpointsResponse.status);
        throw new Error("Failed to fetch URLs data");
      }
      
      // Fetch views and prefix endpoints (optional - may not exist)
      let viewsResponse, prefixResponse;
      try {
        viewsResponse = await fetch(viewsUrl);
      } catch (e) {
        console.log("Views endpoint not available");
      }
      
      try {
        prefixResponse = await fetch(prefixUrl);
      } catch (e) {
        console.log("API prefix endpoint not available");
      }

      let endpointsArray, views, prefixData;
      
      try {
        endpointsArray = await endpointsResponse.json();
      } catch (e) {
        console.error("Failed to parse URLs response:", e);
        throw new Error("URLs endpoint returned invalid JSON");
      }
      
      // Try to parse views response if available
      if (viewsResponse && viewsResponse.ok) {
        try {
          views = await viewsResponse.json();
        } catch (e) {
          console.error("Failed to parse views response:", e);
          views = { viewsets: [] };
        }
      } else {
        views = { viewsets: [] };
      }
      
      // Try to parse prefix response if available
      if (prefixResponse && prefixResponse.ok) {
        try {
          prefixData = await prefixResponse.json();
        } catch (e) {
          console.error("Failed to parse api-prefix response:", e);
          prefixData = { prefix: "/api" };
        }
      } else {
        prefixData = { prefix: "/api" };
      }

      // Extract the first urls object from the array (assuming one per app)
      const urlsData = Array.isArray(endpointsArray) && endpointsArray.length > 0 
        ? endpointsArray[0] 
        : { urlpatterns: [], router_registrations: [] };

      setEndpointsData({
        urlpatterns: urlsData.urlpatterns || [],
        router_registrations: urlsData.router_registrations || []
      });
      
      // Handle views - might be an array or object
      if (Array.isArray(views)) {
        setViewsData({ viewsets: views, django_root: "" });
      } else {
        setViewsData(views);
      }
      
      setApiPrefix(prefixData.prefix || "/api");
      setDjangoRoot(Array.isArray(views) ? "" : (views.django_root || ""));
    } catch (error) {
      console.error("Failed to fetch endpoints data:", error);
      toast.error("Error", {
        description: "Failed to fetch endpoints data",
      });
    } finally {
      setLoading(false);
    }
  };

  const getViewSetForRouter = (viewsetName: string) => {
    return viewsData?.viewsets.find((vs) => vs.name === viewsetName);
  };

  const handleViewSource = (
    appName: string,
    viewsetName: string,
    lineNumber: number | null
  ) => {
    const viewsFilePath = `${djangoRoot}/${appName}/views.py`;
    const cursorUrl = lineNumber
      ? `cursor://file/${viewsFilePath}:${lineNumber}`
      : `cursor://file/${viewsFilePath}`;
    window.open(cursorUrl, "_blank");
  };

  const handleViewEndpoint = (prefix: string) => {
    if (projectId) {
      navigate(
        `/projects/${projectId}/${appName}/endpoint?prefix=${encodeURIComponent(
          prefix
        )}&apiPrefix=${encodeURIComponent(apiPrefix)}`
      );
    } else {
      navigate(
        `/${appName}/endpoint?prefix=${encodeURIComponent(
          prefix
        )}&apiPrefix=${encodeURIComponent(apiPrefix)}`
      );
    }
  };

  const renderEndpointsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading endpoints...</span>
        </div>
      );
    }

    if (!endpointsData) {
      return <div>No endpoints data available</div>;
    }

    return (
      <div className="space-y-6">
        {/* Router Registrations */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Resources
          </h3>
          <div className="space-y-2">
            {endpointsData.router_registrations.map((registration) => {
              const viewset = getViewSetForRouter(registration.viewset);
              return (
                <div
                  key={registration.prefix}
                  className="border rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                >
                  <Accordion type="single" collapsible>
                    <AccordionItem
                      value="viewset-details"
                      className="border-none"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-2">
                          <span className="font-mono text-sm">
                            /{registration.prefix}/
                          </span>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 border-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewEndpoint(registration.prefix);
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Open API endpoint</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 border-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewSource(
                                        appName!,
                                        registration.viewset,
                                        viewset?.lineno
                                      );
                                    }}
                                  >
                                    <Code2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View source code</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {viewset ? (
                          <div className="space-y-4">
                            {viewset.docstring && (
                              <p className="text-sm text-muted-foreground">
                                {viewset.docstring}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1 text-sm">
                                <p>
                                  <strong>Serializer:</strong>{" "}
                                  {viewset.serializer_class}
                                </p>
                                <p>
                                  <strong>Permissions:</strong>{" "}
                                  {viewset.permission_classes.join(", ")}
                                </p>
                                {viewset.lookup_field && (
                                  <p>
                                    <strong>Lookup Field:</strong>{" "}
                                    {viewset.lookup_field}
                                  </p>
                                )}
                              </div>
                            </div>

                            {viewset.methods.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">
                                  Method Implementations
                                </h4>
                                <div className="space-y-3">
                                  {viewset.methods.map((method) => (
                                    <div
                                      key={method.name}
                                      className="border rounded-lg p-3"
                                    >
                                      <h5 className="font-medium mb-2">
                                        {method.name}()
                                      </h5>
                                      {method.docstring && (
                                        <p className="text-sm text-muted-foreground mb-2">
                                          {method.docstring}
                                        </p>
                                      )}
                                      <SyntaxHighlighter
                                        language="python"
                                        style={tomorrow}
                                        className="text-xs rounded overflow-x-auto"
                                      >
                                        {method.body}
                                      </SyntaxHighlighter>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {viewset.actions.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">
                                  Custom Actions
                                </h4>
                                <div className="space-y-3">
                                  {viewset.actions.map((action) => (
                                    <div
                                      key={action.name}
                                      className="border rounded-lg p-3"
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-medium">
                                          @action {action.name}()
                                        </h5>
                                        <Badge variant="outline">
                                          {Array.isArray(
                                            action.decorator_args.methods
                                          )
                                            ? action.decorator_args.methods.join(
                                                ", "
                                              )
                                            : "GET"}
                                        </Badge>
                                        {action.decorator_args.detail && (
                                          <Badge variant="outline">
                                            detail
                                          </Badge>
                                        )}
                                      </div>
                                      {action.docstring && (
                                        <p className="text-sm text-muted-foreground mb-2">
                                          {action.docstring}
                                        </p>
                                      )}
                                      <SyntaxHighlighter
                                        language="python"
                                        style={tomorrow}
                                        className="text-xs rounded overflow-x-auto"
                                      >
                                        {action.body}
                                      </SyntaxHighlighter>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            ViewSet details not available
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* URL Patterns */}
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            URL Patterns
          </h3>
          <div className="space-y-2">
            {endpointsData.urlpatterns.map((pattern) => (
              <div
                key={pattern.name}
                className="border rounded-lg bg-blue-50/30 hover:bg-blue-100/30 transition-colors"
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{pattern.route}</span>
                    <div className="flex gap-2">
                      {pattern.view_type !== "class_based_view" && (
                        <Badge variant="secondary">{pattern.view_type}</Badge>
                      )}
                      <Badge variant="outline">{pattern.name}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProjectLayout
      selectedSection="endpoints"
      pageTitle="Endpoints"
      appName={appName}
    >
      {appName && renderEndpointsContent()}
    </ProjectLayout>
  );
};

export { EndpointsPage };
