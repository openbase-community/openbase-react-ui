import { ProjectLayout } from "@/components/ProjectLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { toast } from "sonner";
import { buildAppApiUrl } from "@/lib/api-utils";
import { Loader2, Settings, Terminal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CommandInfo {
  name: string;
  file: string;
}

interface CommandArgument {
  names: string[];
  kwargs: Record<string, unknown>;
}

interface Command {
  name: string;
  help: string;
  arguments: CommandArgument[];
  handle_body_source: string;
}

const CommandsPage = () => {
  const { appName } = useParams<{ appName: string }>();
  const [commands, setCommands] = useState<CommandInfo[]>([]);
  const [commandDetails, setCommandDetails] = useState<Record<string, Command>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commandToDelete, setCommandToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedCommand, setExpandedCommand] = useState<string | undefined>();

  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();

  useEffect(() => {
    if (appName && !isAppsLoading) {
      fetchCommands();
    }
  }, [appName, isAppsLoading]);

  const fetchCommands = async () => {
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
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, "commands/")
      );
      if (!response.ok) {
        throw new Error("Failed to fetch commands");
      }
      const data = await response.json();
      setCommands(Array.isArray(data) ? data : (data.commands || []));
    } catch (error) {
      console.error("Failed to fetch commands:", error);
      toast.error("Error", {
        description: "Failed to fetch commands data",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCommandDetails = async (commandName: string) => {
    if (!appName || !projectId || commandDetails[commandName]) return; // Already loaded

    const packageName = getPackageNameForApp(appName);
    if (!packageName) {
      console.error(`Package name not found for app: ${appName}`);
      return;
    }

    setLoadingDetails((prev) => new Set(prev).add(commandName));
    try {
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, `commands/${commandName}/`)
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch details for command ${commandName}`);
      }
      const data = await response.json();
      setCommandDetails((prev) => ({
        ...prev,
        [commandName]: data,
      }));
    } catch (error) {
      console.error(
        `Failed to fetch command details for ${commandName}:`,
        error
      );
      toast.error("Error", {
        description: `Failed to fetch details for command ${commandName}`,
      });
    } finally {
      setLoadingDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(commandName);
        return newSet;
      });
    }
  };

  const formatArgumentKwargs = (kwargs: Record<string, unknown>) => {
    return Object.entries(kwargs)
      .filter(([key]) => key !== "help") // Handle help separately
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ");
  };

  const handleDeleteClick = (commandName: string) => {
    setCommandToDelete(commandName);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commandToDelete || !appName || !projectId) return;

    const packageName = getPackageNameForApp(appName);
    if (!packageName) {
      console.error(`Package name not found for app: ${appName}`);
      toast.error("Error", {
        description: `Package name not found for app: ${appName}`,
      });
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, `commands/${commandToDelete}/`),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete command ${commandToDelete}`);
      }

      const data = await response.json();

      // Remove the command from the list
      setCommands((prev) =>
        prev.filter((command) => command.name !== commandToDelete)
      );

      // Remove from details cache
      setCommandDetails((prev) => {
        const newDetails = { ...prev };
        delete newDetails[commandToDelete];
        return newDetails;
      });

      toast.success("Success", {
        description:
          data.message || `Command ${commandToDelete} deleted successfully`,
      });
    } catch (error) {
      console.error(`Failed to delete command ${commandToDelete}:`, error);
      toast.error("Error", {
        description: `Failed to delete command ${commandToDelete}`,
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCommandToDelete(null);
    }
  };

  const renderCommandsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading commands...</span>
        </div>
      );
    }

    if (commands.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No management commands found in this app
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <p>
          Commands are invoked by the admin (you) of the system directly, rather
          than being triggered within the natural course of the app. You can use
          them for creating test data or debugging.
        </p>
        <div className="grid gap-4">
          {commands.map((command) => (
            <Card key={command.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    {command.name}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(command.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion 
                  type="single" 
                  collapsible
                  value={expandedCommand === command.name ? command.name : undefined}
                  onValueChange={(value) => {
                    if (value === command.name) {
                      setExpandedCommand(command.name);
                      fetchCommandDetails(command.name);
                    } else {
                      setExpandedCommand(undefined);
                    }
                  }}
                >
                  <AccordionItem value={command.name}>
                    <AccordionTrigger
                      className="flex items-center gap-2"
                    >
                      {loadingDetails.has(command.name) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading details...
                        </>
                      ) : (
                        "View Command Details"
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      {commandDetails[command.name] ? (
                        <div className="space-y-4">
                          <div className="border rounded-lg p-4">
                            <div className="mb-3">
                              <h4 className="font-medium mb-2">Usage</h4>
                              <code className="text-sm bg-muted px-3 py-2 rounded block">
                                python manage.py {command.name}
                                {commandDetails[command.name].arguments.length >
                                  0 && " [options]"}
                              </code>
                            </div>

                            {commandDetails[command.name].help && (
                              <div className="mb-3">
                                <h4 className="font-medium mb-2">
                                  Description
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {commandDetails[command.name].help}
                                </p>
                              </div>
                            )}

                            {commandDetails[command.name].arguments.length >
                              0 && (
                              <div className="mb-3">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  Arguments & Options
                                </h4>
                                <div className="space-y-2">
                                  {commandDetails[command.name].arguments.map(
                                    (arg, index) => (
                                      <div
                                        key={index}
                                        className="border rounded p-3"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex flex-wrap gap-1">
                                            {arg.names.map((name) => (
                                              <Badge
                                                key={name}
                                                variant="outline"
                                              >
                                                {name}
                                              </Badge>
                                            ))}
                                          </div>
                                          {arg.kwargs.type && (
                                            <Badge variant="secondary">
                                              {String(arg.kwargs.type)}
                                            </Badge>
                                          )}
                                        </div>

                                        {arg.kwargs.help && (
                                          <p className="text-sm text-muted-foreground mb-2">
                                            {String(arg.kwargs.help)}
                                          </p>
                                        )}

                                        {arg.kwargs.default !== undefined && (
                                          <div className="text-sm">
                                            <strong>Default:</strong>{" "}
                                            {JSON.stringify(arg.kwargs.default)}
                                          </div>
                                        )}

                                        {formatArgumentKwargs(arg.kwargs) && (
                                          <div className="text-xs text-muted-foreground mt-2">
                                            {formatArgumentKwargs(arg.kwargs)}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="font-medium mb-2">
                                Implementation
                              </h4>
                              <SyntaxHighlighter
                                language="python"
                                style={tomorrow}
                                className="text-xs rounded overflow-x-auto max-h-96"
                              >
                                {
                                  commandDetails[command.name]
                                    .handle_body_source
                                }
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Command</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the command "{commandToDelete}"?
                This action cannot be undone and will permanently remove the
                command file from your project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <ProjectLayout
      selectedSection="commands"
      pageTitle="Commands"
      appName={appName}
    >
      {appName && renderCommandsContent()}
    </ProjectLayout>
  );
};

export { CommandsPage };
