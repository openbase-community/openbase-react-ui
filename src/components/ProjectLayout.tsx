import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { useProject } from "@/contexts/ProjectContext";
import {
  Code,
  Database,
  Globe,
  Loader2,
  MessageSquare,
  Plus,
  Settings,
  Terminal,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// import { DevServerCodeView } from "./DevServerCodeView";
import { WebAppView } from "./WebAppView";

interface AppInfo {
  name: string;
  path: string;
  apps_dir: string;
  package_name: string;
}

interface CreateAppInfo {
  boilersync_available: boolean;
  available_directories: string[];
  usage: {
    endpoint: string;
    method: string;
    payload: {
      app_name: string;
      directory: string;
      template_name: string;
    };
    example: {
      app_name: string;
      directory: string;
      template_name: string;
    };
  };
}

interface ClaudeMessage {
  id: string;
  type: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
}

interface ClaudeCodeResponse {
  type: string;
  content: string;
  message_id?: string;
}

interface ProjectLayoutProps {
  selectedSection: string;
  pageTitle: string;
  appName?: string;
  children: React.ReactNode;
  // Models sub-sections support
  modelsSubSections?: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
  }>;
  selectedModelsSubSection?: string;
  onModelsSubSectionChange?: (sectionPath: string) => void;
}

export const ProjectLayout = ({
  selectedSection,
  pageTitle,
  appName,
  children,
  modelsSubSections,
  selectedModelsSubSection,
  onModelsSubSectionChange,
}: ProjectLayoutProps) => {
  const { projectId } = useProject();
  const { isAgentChatVisible, setAgentChatVisible } = useAgentChat();
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createAppModalOpen, setCreateAppModalOpen] = useState(false);
  const [createAppInfo, setCreateAppInfo] = useState<CreateAppInfo | null>(
    null
  );
  const [newAppName, setNewAppName] = useState("");
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [templateName, setTemplateName] = useState("django-app");
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [activeTab, setActiveTab] = useState("api");
  const [webAppTabVisited, setWebAppTabVisited] = useState(false);
  const [codeTabVisited, setCodeTabVisited] = useState(false);
  const [claudeCodeTabVisited, setClaudeCodeTabVisited] = useState(false);
  const [devServerCodeTabVisited, setDevServerCodeTabVisited] = useState(false);

  const navigate = useNavigate();

  const sections = [
    { id: "models", label: "Models", icon: Database, path: "models" },
    { id: "endpoints", label: "Endpoints", icon: Globe, path: "endpoints" },
    {
      id: "serializers",
      label: "Serializers",
      icon: Code,
      path: "serializers",
    },
    { id: "tasks", label: "Tasks", icon: Zap, path: "tasks" },
    { id: "commands", label: "Commands", icon: Terminal, path: "commands" },
  ];

  useEffect(() => {
    console.log("ProjectLayout useEffect - projectId:", projectId);
    fetchApps();
  }, [projectId]);

  const fetchApps = async () => {
    console.log("fetchApps called with projectId:", projectId);
    if (!projectId) {
      console.log("No projectId available, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      const url = `/api/openbase/projects/${projectId}/apps/`;
      console.log("Fetching apps from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Apps fetched successfully:", data);
      setApps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      toast.error("Connection Error", {
        description:
          "Failed to connect to the meta-server. Make sure it's running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCreateAppInfo = async () => {
    if (!projectId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/openbase/projects/${projectId}/apps/create/`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CreateAppInfo = await response.json();
      setCreateAppInfo(data);

      // Set default directory if available
      if (data.available_directories.length > 0) {
        setSelectedDirectory(data.available_directories[0]);
      }
    } catch (error) {
      console.error("Failed to fetch create app info:", error);
      toast.error("Error", {
        description: "Failed to fetch app creation information.",
      });
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim()) {
      toast.error("Validation Error", {
        description: "App name is required.",
      });
      return;
    }

    if (!selectedDirectory) {
      toast.error("Validation Error", {
        description: "Please select a directory.",
      });
      return;
    }

    setIsCreatingApp(true);

    try {
      // Compute default values
      const appName = newAppName.trim();
      const projectName = appName; // Default to app name
      const prettyName = appName
        .replace("_", " ")
        .replace("-", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
      const parentPackageName = selectedDirectory.split("/").pop() || appName; // Use directory name

      const response = await fetch(
        `/api/openbase/projects/${projectId}/apps/create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_name: appName,
            directory: selectedDirectory,
            template_name: templateName,
            project_name: projectName,
            pretty_name: prettyName,
            parent_package_name: parentPackageName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      toast.success("Success", {
        description: data.message,
      });

      // Reset form and close modal
      setNewAppName("");
      setSelectedDirectory(createAppInfo?.available_directories[0] || "");
      setTemplateName("django-app");
      setCreateAppModalOpen(false);

      // Refresh apps list
      await fetchApps();
    } catch (error) {
      console.error("Failed to create app:", error);
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to create app.",
      });
    } finally {
      setIsCreatingApp(false);
    }
  };

  const handleOpenCreateAppModal = async () => {
    setCreateAppModalOpen(true);
    await fetchCreateAppInfo();
  };

  const getPackageNameForApp = (appName: string): string | undefined => {
    const app = apps.find((a) => a.name === appName);
    return app?.package_name;
  };

  const handleAppChange = (appName: string) => {
    // Navigate to the same section for the new app, default to models if invalid
    const validSections = [
      "models",
      "endpoints",
      "serializers",
      "tasks",
      "commands",
    ];
    const currentSection = validSections.includes(selectedSection)
      ? selectedSection
      : "models";

    if (projectId) {
      navigate(`/projects/${projectId}/${appName}/${currentSection}`);
    } else {
      navigate(`/${appName}/${currentSection}`);
    }
  };

  const handleSectionChange = (sectionPath: string) => {
    if (projectId) {
      navigate(`/projects/${projectId}/${appName}/${sectionPath}`);
    } else {
      navigate(`/${appName}/${sectionPath}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            Connecting to Django meta-server...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          apps={apps}
          selectedApp={appName || ""}
          onAppChange={handleAppChange}
          onCreateApp={handleOpenCreateAppModal}
          sections={sections}
          selectedSection={selectedSection}
          onSectionChange={handleSectionChange}
          modelsSubSections={modelsSubSections}
          selectedModelsSubSection={selectedModelsSubSection}
          onModelsSubSectionChange={onModelsSubSectionChange}
        />

        <main className="flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              if (value === "webapp") {
                setWebAppTabVisited(true);
              } else if (value === "code") {
                setCodeTabVisited(true);
              } else if (value === "claude-code") {
                setClaudeCodeTabVisited(true);
              } else if (value === "dev-server-code") {
                setDevServerCodeTabVisited(true);
              }
            }}
            className="w-full flex flex-col flex-1"
          >
            <div className="border-b border-border bg-muted/30 flex items-center justify-between px-4">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="api"
                  className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-2 py-1 text-xs"
                >
                  API
                </TabsTrigger>
                <TabsTrigger
                  value="webapp"
                  className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-2 py-1 text-xs"
                >
                  Preview
                </TabsTrigger>
                {/* {!import.meta.env.VITE_IS_CLOUD && (
                  <TabsTrigger
                    value="code"
                    className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-2 py-1 text-xs"
                  >
                    Code?
                  </TabsTrigger>
                )} */}
                <TabsTrigger
                  value="dev-server-code"
                  className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-2 py-1 text-xs"
                >
                  Code
                </TabsTrigger>
              </TabsList>
              {!isAgentChatVisible && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAgentChatVisible(true)}
                  className="h-8 w-8 mr-2"
                  title="Show Agent Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div
              className={`p-6 space-y-4 flex-1 ${
                activeTab === "api" ? "block" : "hidden"
              }`}
            >
              <header className="mb-6 flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {appName ? `${appName} - ${pageTitle}` : pageTitle}
                  </h1>
                </div>
              </header>
              {appName || selectedSection === "settings" ? (
                children
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome to Openbase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Select an app from the sidebar to start exploring.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div
              className={`space-y-4 bg-muted/50 p-6 flex-1 ${
                activeTab === "webapp" ? "block" : "hidden"
              }`}
            >
              {webAppTabVisited && <WebAppView appName={appName} />}
            </div>
            {/* {!import.meta.env.VITE_IS_CLOUD && (
              <div
                className={`space-y-4 bg-muted/50 p-6 flex-1 ${
                  activeTab === "code" ? "block" : "hidden"
                }`}
              >
                {codeTabVisited && <CodeView appName={appName} />}
              </div>
            )} */}
            <div
              className={`space-y-4 bg-muted/50 p-6 flex-1 ${
                activeTab === "dev-server-code" ? "block" : "hidden"
              }`}
            >
              {devServerCodeTabVisited && (
                <div>Dev Server Code</div>
                // <DevServerCodeView appName={appName} />
              )}
            </div>
          </Tabs>
        </main>

        {/* Create App Modal */}
        <Dialog open={createAppModalOpen} onOpenChange={setCreateAppModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Django App</DialogTitle>
              <DialogDescription>
                Create a new Django app using boilersync templates.
              </DialogDescription>
            </DialogHeader>

            {createAppInfo && !createAppInfo.boilersync_available && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  Boilersync is not available. Please install it to use this
                  feature.
                </p>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="appName" className="text-right">
                  App Name
                </Label>
                <Input
                  id="appName"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="my_app"
                  className="col-span-3"
                  disabled={isCreatingApp}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="directory" className="text-right">
                  Directory
                </Label>
                <Select
                  value={selectedDirectory}
                  onValueChange={setSelectedDirectory}
                  disabled={isCreatingApp}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select directory" />
                  </SelectTrigger>
                  <SelectContent>
                    {createAppInfo?.available_directories.map((dir) => (
                      <SelectItem key={dir} value={dir}>
                        {dir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template" className="text-right">
                  Template
                </Label>
                <Input
                  id="template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="django-app"
                  className="col-span-3"
                  disabled={isCreatingApp}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateAppModalOpen(false)}
                disabled={isCreatingApp}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateApp}
                disabled={isCreatingApp || !createAppInfo?.boilersync_available}
              >
                {isCreatingApp && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create App
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

const AppSidebar = ({
  apps,
  selectedApp,
  onAppChange,
  onCreateApp,
  sections,
  selectedSection,
  onSectionChange,
  modelsSubSections,
  selectedModelsSubSection,
  onModelsSubSectionChange,
}: {
  apps: AppInfo[];
  selectedApp: string;
  onAppChange: (app: string) => void;
  onCreateApp: () => void;
  sections: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
  }>;
  selectedSection: string;
  onSectionChange: (sectionPath: string) => void;
  modelsSubSections?: Array<{
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
  }>;
  selectedModelsSubSection?: string;
  onModelsSubSectionChange?: (sectionPath: string) => void;
}) => {
  const { state } = useSidebar();
  const { projectId } = useProject();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    if (projectId) {
      navigate(`/projects/${projectId}/settings`);
    } else {
      navigate("/settings");
    }
  };

  return (
    <Sidebar className="w-64" collapsible="icon">
      <div className="p-4 border-b">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Openbase</h2>
            <button
              onClick={handleSettingsClick}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSettingsClick}
            className="w-full p-1 hover:bg-accent rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground mx-auto" />
          </button>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-2 py-1">
            <SidebarGroupLabel className="px-0">Apps</SidebarGroupLabel>
            {!isCollapsed && (
              <button
                onClick={onCreateApp}
                className="p-1 hover:bg-accent rounded-md transition-colors ml-auto"
                title="Create New App"
              >
                <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <div className="px-2 py-1">
              <button
                onClick={onCreateApp}
                className="w-full p-1 hover:bg-accent rounded-md transition-colors"
                title="Create New App"
              >
                <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground mx-auto" />
              </button>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {(apps || []).map((app) => (
                <SidebarMenuItem key={app.name}>
                  <SidebarMenuButton
                    onClick={() => onAppChange(app.name)}
                    className={selectedApp === app.name ? "bg-accent" : ""}
                    title={`App: ${app.name}\nPath: ${app.path}\nApps Dir: ${app.apps_dir}`}
                  >
                    {app.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {selectedApp && (
          <SidebarGroup>
            <SidebarGroupLabel>Sections</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        onClick={() => onSectionChange(section.path)}
                        className={
                          selectedSection === section.id ? "bg-accent" : ""
                        }
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {section.label}
                      </SidebarMenuButton>

                      {section.id === "models" &&
                        selectedSection === "models" &&
                        modelsSubSections &&
                        onModelsSubSectionChange && (
                          <SidebarMenuSub>
                            {modelsSubSections.map((subSection) => {
                              const SubIcon = subSection.icon;
                              return (
                                <SidebarMenuSubItem key={subSection.id}>
                                  <SidebarMenuSubButton
                                    onClick={() =>
                                      onModelsSubSectionChange(subSection.path)
                                    }
                                    className={
                                      selectedModelsSubSection === subSection.id
                                        ? "bg-accent"
                                        : ""
                                    }
                                  >
                                    <SubIcon className="h-4 w-4 mr-2" />
                                    {subSection.label}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};
