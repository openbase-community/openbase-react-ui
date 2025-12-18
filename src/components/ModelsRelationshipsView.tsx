import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { useApps } from "@/hooks/use-apps";
import { toast } from "@/hooks/use-toast";
import { buildAppApiUrl } from "@/lib/api-utils";
import { getEmojiFromDocstring } from "@/lib/emoji-utils";
import {
  Background,
  Controls,
  Edge,
  Handle,
  Node,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Database, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ModelField {
  name: string;
  type: string;
  kwargs: Record<string, unknown>;
}

interface Model {
  name: string;
  docstring: string;
  fields: ModelField[];
}

interface ModelsRelationshipsViewProps {
  appName: string;
}

interface ModelNodeData {
  name: string;
  docstring: string;
}

// Custom node component
const ModelNode = ({ data }: { data: ModelNodeData }) => {
  const emojiResult = getEmojiFromDocstring(data.docstring);

  const handleStyle = {
    opacity: 0,
    pointerEvents: "none" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "1px",
    height: "1px",
    border: "none",
    background: "transparent",
  };

  return (
    <>
      {/* Perfectly overlapped handles for consistent connection points */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={handleStyle}
      />
      <Handle
        type="source"
        position={Position.Top}
        isConnectable={false}
        style={handleStyle}
      />

      <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200 min-w-[140px] max-w-[180px] bg-white border-2 border-gray-200">
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            {emojiResult ? (
              <span className="text-2xl">{emojiResult.emoji}</span>
            ) : (
              <Database className="h-6 w-6 text-primary" />
            )}
            <h3 className="font-medium text-sm text-center break-words">
              {data.name}
            </h3>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Define nodeTypes outside component to prevent re-creation on every render
const nodeTypes = {
  modelNode: ModelNode,
};

export const ModelsRelationshipsView = ({
  appName,
}: ModelsRelationshipsViewProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const navigate = useNavigate();
  const { projectId } = useProject();
  const { getPackageNameForApp, isLoading: isAppsLoading } = useApps();


  useEffect(() => {
    if (!isAppsLoading) {
      fetchModels();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appName, isAppsLoading]);

  // Save node positions to localStorage whenever nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const positions = nodes.reduce((acc, node) => {
        acc[node.id] = node.position;
        return acc;
      }, {} as Record<string, { x: number; y: number }>);

      localStorage.setItem(
        `django-models-positions-${appName}`,
        JSON.stringify(positions)
      );
    }
  }, [nodes, appName]);

  // Convert models to nodes and edges when models change
  useEffect(() => {
    if (models.length > 0) {
      const newNodes = createNodesFromModels(models);
      const newEdges = createEdgesFromModels(models);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [models, setNodes, setEdges]);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const packageName = getPackageNameForApp(appName);
      if (!packageName) {
        throw new Error(`Package name not found for app: ${appName}`);
      }
      
      const response = await fetch(
        buildAppApiUrl(projectId, packageName, appName, "models/")
      );

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      const newModels = Array.isArray(data) ? data : (data.models || []);
      setModels(newModels);

    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast({
        title: "Error",
        description: "Failed to fetch models data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [appName, projectId, getPackageNameForApp]);

  // Create nodes with simple circular layout, using saved positions if available
  const createNodesFromModels = (models: Model[]): Node[] => {
    // Load saved positions from localStorage
    const savedPositions = (() => {
      try {
        const saved = localStorage.getItem(
          `django-models-positions-${appName}`
        );
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    })();

    const centerX = 400;
    const centerY = 300;
    const radius = Math.max(150, models.length * 30);

    return models.map((model, index) => {
      // Use saved position if available, otherwise calculate new position
      const savedPosition = savedPositions[model.name];
      let position;

      if (savedPosition) {
        position = savedPosition;
      } else {
        // Calculate circular layout position for new models
        const angle = (index / models.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        position = { x: x - 90, y: y - 50 };
      }

      return {
        id: model.name,
        type: "modelNode",
        position,
        data: {
          name: model.name,
          docstring: model.docstring,
        },
        draggable: true,
      };
    });
  };

  // Create edges from model relationships
  const createEdgesFromModels = (models: Model[]): Edge[] => {
    const edges: Edge[] = [];
    const modelNames = new Set(models.map((m) => m.name));

    models.forEach((model) => {
      model.fields?.forEach((field) => {
        // Check if this field represents a relationship
        const isRelationshipField = [
          "models.ForeignKey",
          "models.OneToOneField",
          "models.ManyToManyField",
        ].includes(field.type);

        if (
          isRelationshipField &&
          field.kwargs?.to &&
          typeof field.kwargs.to === "string"
        ) {
          const targetModel = field.kwargs.to;

          // Only create edge if target model exists in our current model set
          if (modelNames.has(targetModel)) {
            const edgeId = `${model.name}-${field.name}-${targetModel}`;

            // Determine edge styling based on relationship type
            let edgeStyle = {};
            let edgeLabel = "";

            if (field.type === "models.ForeignKey") {
              edgeStyle = {
                stroke: "#3b82f6",
                strokeWidth: 2,
              };
              edgeLabel = "FK";
            } else if (field.type === "models.OneToOneField") {
              edgeStyle = {
                stroke: "#059669",
                strokeWidth: 2,
              };
              edgeLabel = "1:1";
            } else if (field.type === "models.ManyToManyField") {
              edgeStyle = {
                stroke: "#dc2626",
                strokeWidth: 2,
                strokeDasharray: "8,4",
              };
              edgeLabel = "M:M";
            }

            edges.push({
              id: edgeId,
              source: model.name,
              target: targetModel,
              style: edgeStyle,
              label: edgeLabel,
              type: "smoothstep",
            });
          }
        }
      });
    });

    return edges;
  };

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log(`Clicked on model: ${node.data.name}`);
      // Navigate to ModelsView with the clicked model expanded
      navigate(
        `/projects/${projectId}/${appName}/models?expand=${node.data.name}`
      );
    },
    [navigate, appName]
  );

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

      <div className="w-full h-[600px] bg-muted/10 rounded-lg border overflow-hidden">
        {models.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              No models found for this app.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background />
            <Panel
              position="top-left"
              className="bg-background p-2 rounded border text-sm text-muted-foreground"
            >
              {models.length} model{models.length !== 1 ? "s" : ""} found
              {edges.length > 0 && (
                <div>
                  {edges.length} relationship{edges.length !== 1 ? "s" : ""}
                </div>
              )}
            </Panel>
            <Panel
              position="top-right"
              className="bg-background p-2 rounded border text-xs text-muted-foreground"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span>ForeignKey</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-green-600"></div>
                  <span>OneToOne</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-600 border-dashed border-t-2 bg-transparent"></div>
                  <span>ManyToMany</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
