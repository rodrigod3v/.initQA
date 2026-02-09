import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import StepNode from './StepNode';
import { type Step } from '@/stores/scenarioStore';

const nodeTypes = {
    stepNode: StepNode,
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({ rankdir: 'TB' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 170, height: 60 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Top;
        node.sourcePosition = Position.Bottom;
        node.position = {
            x: nodeWithPosition.x - 170 / 2,
            y: nodeWithPosition.y - 60 / 2,
        };
    });

    return { nodes, edges };
};

interface VisualBuilderProps {
    initialSteps: Step[];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onStepsChange: (steps: Step[]) => void;
}

const VisualBuilder: React.FC<VisualBuilderProps> = ({ initialSteps, onStepsChange: _onStepsChange }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!initialSteps) return;

        const initialNodes: Node[] = initialSteps.map((step, index) => ({
            id: index.toString(),
            type: 'stepNode',
            data: { label: step.selector || step.value || '', type: step.type },
            position: { x: 0, y: 0 },
        }));

        const initialEdges: Edge[] = initialSteps.slice(0, -1).map((_, index) => ({
            id: `e${index}-${index + 1}`,
            source: index.toString(),
            target: (index + 1).toString(),
            type: 'smoothstep',
            animated: true,
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [initialSteps, setNodes, setEdges]);

    // Note: Two-way binding (Graph -> JSON) is complex and implemented basically here.
    // Full implementation would require re-ordering based on edges.

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default VisualBuilder;
