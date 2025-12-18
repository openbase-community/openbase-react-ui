import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { toast } from "sonner";
import { buildAppApiUrl } from "@/lib/api-utils";
import { Clock, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Task {
  name: string;
  path: string;
  app_name: string;
  package_name: string;
  is_async: boolean;
  docstring: string;
  body_source: string;
  args: {
    regular_args: string[];
    keyword_only: string[];
    positional_only: string[];
    defaults: Record<string, unknown>;
    vararg: string | null;
    kwarg: string | null;
  };
}

interface TasksViewProps {
  appName: string;
}

export const TasksView = ({ appName }: TasksViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();

  useEffect(() => {
    if (!isAppsLoading) {
      fetchTasks();
    }
  }, [appName, isAppsLoading]);

  const fetchTasks = async () => {
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
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, "tasks/")
      );
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : (data.tasks || []));
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Error", {
        description: "Failed to fetch tasks data",
      });
    } finally {
      setLoading(false);
    }
  };

  // No longer need fetchTaskDetails since all data comes in the initial response

  const formatArguments = (args: Task["args"]) => {
    const parts: string[] = [];

    // Positional only args
    args.positional_only.forEach((arg) => parts.push(`${arg}/`));

    // Regular args (with defaults if available)
    args.regular_args.forEach((arg) => {
      const defaultValue = args.defaults[arg];
      if (defaultValue !== undefined) {
        parts.push(`${arg}=${JSON.stringify(defaultValue)}`);
      } else {
        parts.push(arg);
      }
    });

    // Vararg
    if (args.vararg) {
      parts.push(`*${args.vararg}`);
    }

    // Keyword only args
    args.keyword_only.forEach((arg) => parts.push(`${arg}`));

    // Kwarg
    if (args.kwarg) {
      parts.push(`**${args.kwarg}`);
    }

    return parts.join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tasks found in this app</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {task.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {task.is_async && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Async
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {task.path.split('/').pop()}
                  </span>
                </div>

                {task.docstring && (
                  <p className="text-sm text-muted-foreground">
                    {task.docstring}
                  </p>
                )}

                <Accordion type="single" collapsible>
                  <AccordionItem value="task-details">
                    <AccordionTrigger className="flex items-center gap-2">
                      View Implementation
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="mb-3">
                          <h5 className="font-medium text-sm mb-2">
                            Function Signature
                          </h5>
                          <SyntaxHighlighter
                            language="python"
                            style={tomorrow}
                            className="text-sm rounded"
                          >
                            {`${
                              task.is_async ? "async def " : "def "
                            }${task.name}(${formatArguments(
                              task.args
                            )}):`}
                          </SyntaxHighlighter>
                        </div>

                        {(task.args.regular_args.length > 0 ||
                          task.args.keyword_only.length > 0) && (
                          <div className="mb-3">
                            <h5 className="font-medium text-sm mb-2">
                              Arguments
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {task.args.regular_args.map((arg) => (
                                <Badge key={arg} variant="outline">
                                  {arg}
                                </Badge>
                              ))}
                              {task.args.keyword_only.map((arg) => (
                                <Badge key={arg} variant="secondary">
                                  {arg} (keyword only)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="font-medium text-sm mb-2">
                            Implementation
                          </h5>
                          <SyntaxHighlighter
                            language="python"
                            style={tomorrow}
                            className="text-xs rounded overflow-x-auto max-h-96"
                          >
                            {task.body_source}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
