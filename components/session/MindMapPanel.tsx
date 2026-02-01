import React, { useCallback, KeyboardEvent, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import { Button, Space, Tooltip, Modal, Input, type InputRef } from 'antd';
import {
  PlusCircleOutlined,
  NodeIndexOutlined,
  DeleteOutlined,
  EnterOutlined
} from '@ant-design/icons';
import '@xyflow/react/dist/style.css';
import MindMapNode, { MindMapNodeData } from './MindMapNode';
import { getLayoutedElements, getVisibleNodes } from './layoutUtils';

// Register custom node types
const nodeTypes = {
  mindMap: MindMapNode,
};

// Update CustomNode definition to match MindMapNodeData but compatible with ReactFlow Node
type CustomNode = Node<MindMapNodeData>;

interface MindMapPanelProps {
  nodes: CustomNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<CustomNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (params: Connection) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: CustomNode) => void;
  handleAddNode: () => void;
  setNodes: React.Dispatch<React.SetStateAction<CustomNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  isReadOnly?: boolean;
}

const MindMapContent: React.FC<MindMapPanelProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick: externalOnNodeDoubleClick,
  setNodes,
  setEdges,
  isReadOnly = false,
}) => {
  const { getNodes, getEdges, setCenter, getViewport } = useReactFlow();

  // Renaming state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const inputRef = useRef<InputRef>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isRenameModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenameModalOpen]);

  // Declare applyAutoLayout and toggleNodeExpansion using refs to break circular dependency
  const applyAutoLayoutRef = useRef<(currentNodes: CustomNode[], currentEdges: Edge[], focusNodeId?: string) => void>(() => { });
  const toggleNodeExpansionRef = useRef<(nodeId: string, expand?: boolean) => void>(() => { });

  // Expand/Collapse logic
  const toggleNodeExpansion = useCallback((nodeId: string, expand?: boolean) => {
    const currentNodes = getNodes() as CustomNode[];
    const currentEdges = getEdges();

    const newNodes = currentNodes.map(n => {
      if (n.id === nodeId) {
        const currentExpanded = n.data.expanded ?? true; // Default to true
        const newExpanded = expand !== undefined ? expand : !currentExpanded;
        return { ...n, data: { ...n.data, expanded: newExpanded } };
      }
      return n;
    });

    // Re-apply layout including visibility calculation
    applyAutoLayoutRef.current(newNodes, currentEdges);
  }, [getNodes, getEdges]); // applyAutoLayout is defined below, need to ensure cyclic dependency handled or order matches

  // Update ref whenever toggleNodeExpansion changes
  useEffect(() => {
    toggleNodeExpansionRef.current = toggleNodeExpansion;
  }, [toggleNodeExpansion]);

  // Auto-layout with visibility handling
  const applyAutoLayout = useCallback((currentNodes: CustomNode[], currentEdges: Edge[], focusNodeId?: string) => {
    // 0. Inject live data helpers (hasChildren, onToggle)
    // We need to ensure every node has the onToggle callback and correct hasChildren state
    // strictly speaking, we should do this when nodes/edges change, but doing it here ensures consistency before layout.
    // However, setNodes triggers re-render, so we must be careful not to loop.
    // The nodes passed here are expanding/collapsing, so we just want to update visibility.
    // The "live" props like onToggle should ideally be stable.

    const nodesWithData = currentNodes.map(node => {
      const hasChildren = currentEdges.some(e => e.source === node.id);
      // Only update if changed to avoid unnecessary re-renders if strict
      return {
        ...node,
        type: 'mindMap', // Ensure type is always mindMap
        data: {
          ...node.data,
          hasChildren,
          onToggle: (id: string) => toggleNodeExpansionRef.current(id)
        }
      };
    });

    // 1. Calculate visibility based on 'expanded' state
    const nodesWithVisibility = getVisibleNodes(nodesWithData, currentEdges) as CustomNode[];

    // 2. Filter visible nodes for layout calculation
    const visibleNodes = nodesWithVisibility.filter(n => !n.hidden);
    const visibleEdges = currentEdges.filter(e =>
      !nodesWithVisibility.find(n => n.id === e.source)?.hidden &&
      !nodesWithVisibility.find(n => n.id === e.target)?.hidden
    );

    // 3. Layout visible elements
    const { nodes: layoutedVisibleNodes, edges: layoutedVisibleEdges } = getLayoutedElements(
      visibleNodes,
      visibleEdges
    );

    // 4. Merge results: Update positions for visible nodes, keep hidden nodes hidden
    const finalNodes = nodesWithVisibility.map(node => {
      const layoutedNode = layoutedVisibleNodes.find(ln => ln.id === node.id);
      if (layoutedNode) {
        return layoutedNode;
      }
      return node;
    }) as CustomNode[];

    // Edges generally don't change properties other than maybe logic in getLayoutedElements if it modified them
    // But we should pass all edges back, maybe just keeping currentEdges is fine but Dagre might return updated edge points if we used them.
    // For now, React Flow handles edge routing implicitly or via type.

    setNodes(finalNodes);
    setEdges(currentEdges);

    if (focusNodeId) {
      const focusNode = finalNodes.find(n => n.id === focusNodeId);
      if (focusNode && focusNode.position) {
        // Center the view on the new node
        // Assuming default node width/height if not measured yet, but layout usually provides it.
        // We focus on the node's position.
        const x = focusNode.position.x + (focusNode.width || 150) / 2;
        const y = focusNode.position.y + (focusNode.height || 40) / 2;

        // Preserve current zoom
        const { zoom } = getViewport();
        setCenter(x, y, { duration: 800, zoom });
      }
    }
  }, [setNodes, setEdges, setCenter, getViewport]);

  // Update ref whenever applyAutoLayout changes
  useEffect(() => {
    applyAutoLayoutRef.current = applyAutoLayout;
  }, [applyAutoLayout]);

  // NOTE: toggleNodeExpansion depends on applyAutoLayout and vice versa if not careful.
  // To break cycle, toggleNodeExpansion defines logic but calls a layout helper.
  // Or we use a ref for the layout function if needed, but here:
  // toggleNodeExpansion calls applyAutoLayout.
  // applyAutoLayout calls setNodes.
  // applyAutoLayout does NOT call toggleNodeExpansion (it passes it as callback).
  // So dependency order: define applyAutoLayout FIRST, then toggleNodeExpansion? No, toggle needs to be passed to node.
  // We can use a stable ref for toggleNodeExpansion or wrap it.
  // Actually, standard pattern: define toggleNodeExpansion using `setNodes` directly, OR just pass a stable handler that calls the logic.

  // Let's rely on the fact that function hoisting doesn't work for const.
  // We need to use `useCallback` effectively.

  // Re-structure:
  // 1. Define toggleNodeExpansion (it needs applyAutoLayout) -> Problem if applyAutoLayout needs toggleNodeExpansion to inject into data.
  // Solution: Injecting functions into data is sometimes tricky with re-renders.
  // Better: The `onToggle` in data calls a stable function that reads the latest state?

  // Let's resolve the circular dependency by moving the data injection to a separate step or just defining them in order.
  // Actually, we can define `onToggleWrapper` which calls `toggleNodeExpansion`.

  // Revised Order:
  // 1. applyAutoLayout (needs to inject onToggle)
  // 2. toggleNodeExpansion (needs applyAutoLayout)
  // Cycle!

  // Fix: applyAutoLayout shouldn't be responsible for injecting `onToggle` if we can help it, OR
  // we use a `useEffect` to keep data in sync.
  // Or better: pass `onToggle` via a Context or custom hook, but specific to this flow.
  // Simplest: `applyAutoLayout` accepts `onToggle` as arg? No, used in callback.

  // Hack/Simple Fix: Use a ref for `toggleNodeExpansion` so `applyAutoLayout` can start using it before it's fully defined (if it was a function declaration).
  // But with const/useCallback, we can't.

  // Let's separate the "Inject Data" logic from "Layout" logic.
  // Or just use `useEffect` to update the nodes with the handler?

  // Let's try to define `toggleNodeExpansion` *inside* the component, but `applyAutoLayout` depends on it.
  // We can leave `onToggle` undefined in `applyAutoLayout` initially? No.

  // Let's make `toggleNodeExpansion` stable and NOT depend on `applyAutoLayout` directly?
  // No, it needs to re-layout.

  // OK, `applyAutoLayout` does NOT need to update `data.onToggle`.
  // We can ensure `data.onToggle` is set when we Create/Add nodes.
  // And also we might need to "refresh" it if we load nodes from props.

  // Let's do this:
  // We'll define `toggleNodeExpansion` which does the node map update + layout call.
  // But `applyAutoLayout` is just "Layout these nodes".
  // It shouldn't inject data.
  // We will Inject Data in a `useEffect` or when adding nodes.

  // BUT: existing nodes from props need the handler.
  // So we probably need a `useEffect` that runs on mount/updates to inject handlers.

  // Let's refactor `applyAutoLayout` to ONLY do layout/visibility.
  // And we'll update the node data (hasChildren, onToggle) in a separate pass or effect.

  /* Refactoring Plan in replacement chunk:
     1. Define applyAutoLayout (pure layout/vis).
     2. Define toggleNodeExpansion (calls applyAutoLayout).
     3. Effect to validat/inject data into nodes (if missing onToggle or type).
  */

  // React Flow `<ReactFlow>` nodeTypes prop.

  const getSelectedNode = useCallback(() => {
    return getNodes().find((n) => n.selected);
  }, [getNodes]);

  // MOVE definitions up/down to allow cleaner references if possible, or use standard functions.

  // For this edit, I will stick to the previous pattern but be careful.
  // I will replace the component content significantly.


  const addChildNode = useCallback(() => {
    const parentNode = getSelectedNode();
    if (!parentNode) return;

    const newNodeId = Date.now().toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: 0, y: 0 }, // Position will be handled by auto-layout
      data: { label: 'New Topic' },
      type: 'default',
      selected: true, // Auto-select new node
    };

    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNodeId}`,
      source: parentNode.id,
      target: newNodeId,
    };

    // Deselect other nodes
    const currentNodes = getNodes().map(n => ({ ...n, selected: false }));
    const updatedNodes = [...currentNodes, newNode] as CustomNode[];
    const updatedEdges = [...getEdges(), newEdge];

    applyAutoLayout(updatedNodes, updatedEdges, newNodeId);

    // Auto-open rename modal
    setEditingNodeId(newNodeId);
    setEditingLabel(newNode.data.label);
    setIsRenameModalOpen(true);
  }, [getSelectedNode, getNodes, getEdges, applyAutoLayout]);

  const addSiblingNode = useCallback(() => {
    const selectedNode = getSelectedNode();
    if (!selectedNode) return;

    const parentEdge = getEdges().find((e) => e.target === selectedNode.id);

    const newNodeId = Date.now().toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: 0, y: 0 },
      data: { label: 'Sibling Topic' },
      type: 'default',
      selected: true, // Auto-select new node
    };

    let updatedEdges = getEdges();
    if (parentEdge) {
      const newEdge: Edge = {
        id: `e${parentEdge.source}-${newNodeId}`,
        source: parentEdge.source,
        target: newNodeId,
      };
      updatedEdges = [...updatedEdges, newEdge];
    } else {
      // Root sibling logic if needed, or just add node
    }

    // Deselect other nodes
    const currentNodes = getNodes().map(n => ({ ...n, selected: false }));
    const updatedNodes = [...currentNodes, newNode] as CustomNode[];
    applyAutoLayout(updatedNodes, updatedEdges, newNodeId);

    // Auto-open rename modal
    setEditingNodeId(newNodeId);
    setEditingLabel(newNode.data.label);
    setIsRenameModalOpen(true);
  }, [getSelectedNode, getNodes, getEdges, applyAutoLayout]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    // Prevent deletion of root nodes (nodes with no incoming edges)
    const currentEdges = getEdges();
    const incomingEdgeTargets = new Set(currentEdges.map(e => e.target));

    // Nodes to delete must have an incoming edge (i.e., not a root)
    // Exception: If we decide to allow deleting roots if they are not the *initial* root, 
    // but typically "Root" implies the main topic. 
    // This logic protects ALL roots (any node with no parent).
    const directNodesToDelete = selectedNodes.filter(n => incomingEdgeTargets.has(n.id));

    if (directNodesToDelete.length === 0) return;

    // Recursive helper to find all descendants
    const getDescendants = (nodeIds: string[], accumulated: Set<string> = new Set()): Set<string> => {
      const children = currentEdges
        .filter(e => nodeIds.includes(e.source))
        .map(e => e.target);

      if (children.length === 0) return accumulated;

      const newChildren = children.filter(id => !accumulated.has(id));
      newChildren.forEach(id => accumulated.add(id));

      return getDescendants(newChildren, accumulated);
    };

    // Collect all descendants for cascading deletion
    const descendants = getDescendants(directNodesToDelete.map(n => n.id));
    const allIdsToDelete = new Set([...directNodesToDelete.map(n => n.id), ...descendants]);

    // Find parent to focus after deletion logic needs to consider the *top-most* deleted nodes
    // We prioritize the parent of the first *direct* deleted node
    let parentIdToFocus: string | undefined;
    const firstDeletedNode = directNodesToDelete[0];
    const parentEdge = currentEdges.find(e => e.target === firstDeletedNode.id);
    if (parentEdge) {
      parentIdToFocus = parentEdge.source;
    }

    const remainingNodes = getNodes()
      .filter((n) => !allIdsToDelete.has(n.id))
      .map(n => {
        // If this node is the identified parent and currently exists (wasn't deleted), select it
        // Also clear selection for others to ensure single focus behavior
        if (parentIdToFocus && n.id === parentIdToFocus) {
          return { ...n, selected: true };
        }
        return { ...n, selected: false };
      }) as CustomNode[];

    const remainingEdges = getEdges().filter((e) => !allIdsToDelete.has(e.source) && !allIdsToDelete.has(e.target));

    applyAutoLayout(remainingNodes, remainingEdges);
  }, [getNodes, getEdges, applyAutoLayout]);

  const onNodeDoubleClickInternal = useCallback((event: React.MouseEvent, node: CustomNode) => {
    if (isReadOnly) return;

    // Open rename modal
    setEditingNodeId(node.id);
    setEditingLabel(node.data.label);
    setIsRenameModalOpen(true);

    // Also call external handler if provided (for logging or other side effects)
    if (externalOnNodeDoubleClick) {
      externalOnNodeDoubleClick(event, node);
    }
  }, [isReadOnly, externalOnNodeDoubleClick]);

  // NOTE: toggleNodeExpansion was duplicated here. Logic is moved to top.

  const handleRenameSave = useCallback(() => {
    if (!editingNodeId) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            selected: true, // Restore/Enforce selection
            data: {
              ...node.data,
              label: editingLabel,
            },
          };
        }
        // Deselect all others to ensure single focus
        return { ...node, selected: false };
      })
    );
    setIsRenameModalOpen(false);
    setEditingNodeId(null);
    setEditingLabel('');
  }, [editingNodeId, editingLabel, setNodes]);

  const moveSelection = useCallback((key: string) => {
    const selectedNode = getSelectedNode() as CustomNode | undefined;
    if (!selectedNode) return;

    const currentNodes = getNodes() as CustomNode[];
    const currentEdges = getEdges();

    // Sort logic helper
    const getSortedChildren = (parentNodeId: string) => {
      const childEdges = currentEdges.filter(e => e.source === parentNodeId);
      const childNodes = currentNodes.filter(n => childEdges.some(e => e.target === n.id) && !n.hidden);
      return childNodes.sort((a, b) => a.position.y - b.position.y);
    };

    let nextNodeId: string | undefined;

    if (key === 'ArrowLeft') {
      // Navigate to parent
      const parentEdge = currentEdges.find(e => e.target === selectedNode.id);
      if (parentEdge) {
        nextNodeId = parentEdge.source;
      }
    } else if (key === 'ArrowRight') {
      // Navigate to child
      if (selectedNode.data.expanded !== false) {
        const childNodes = getSortedChildren(selectedNode.id);
        if (childNodes.length > 0) {
          const middleIndex = Math.floor(childNodes.length / 2);
          nextNodeId = childNodes[middleIndex].id;
        }
      }
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      const parentEdge = currentEdges.find(e => e.target === selectedNode.id);

      let siblings: CustomNode[] = [];
      if (parentEdge) {
        siblings = getSortedChildren(parentEdge.source);
      } else {
        // Root nodes
        const nonRootIds = new Set(currentEdges.map(e => e.target));
        siblings = currentNodes.filter(n => !nonRootIds.has(n.id) && !n.hidden);
        siblings.sort((a, b) => a.position.y - b.position.y);
      }

      // Ensure current node is in siblings (it should be unless hidden logic is buggy)
      const currentIndex = siblings.findIndex(n => n.id === selectedNode.id);
      if (currentIndex !== -1) {
        if (key === 'ArrowUp' && currentIndex > 0) {
          nextNodeId = siblings[currentIndex - 1].id;
        } else if (key === 'ArrowDown' && currentIndex < siblings.length - 1) {
          nextNodeId = siblings[currentIndex + 1].id;
        }
      }
    }

    if (nextNodeId) {
      setNodes((nds) => nds.map(n => ({
        ...n,
        selected: n.id === nextNodeId
      })));

      // Auto-pan to next node
      const nextNode = currentNodes.find(n => n.id === nextNodeId);
      if (nextNode && nextNode.position) {
        const x = nextNode.position.x + (nextNode.width || 150) / 2;
        const y = nextNode.position.y + (nextNode.height || 40) / 2;
        const { zoom } = getViewport();
        setCenter(x, y, { duration: 300, zoom });
      }
    }
  }, [getNodes, getEdges, getSelectedNode, setNodes, toggleNodeExpansion, setCenter, getViewport]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (isReadOnly || isRenameModalOpen) return;

    const activeElement = document.activeElement;
    const isInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
    if (isInput) return;

    switch (event.key) {
      case 'Tab': // Insert child
        event.preventDefault(); // Prevent focus change
        addChildNode();
        break;
      case 'Enter': // Insert sibling
        event.preventDefault();
        addSiblingNode();
        break;
      case 'Delete': // Delete
      case 'Backspace':
        deleteSelectedNodes();
        break;
      case ' ': // Space: Rename
        event.preventDefault(); // Prevent scrolling
        const selectedNode = getSelectedNode();
        if (selectedNode) {
          setEditingNodeId(selectedNode.id);
          setEditingLabel(selectedNode.data.label);
          setIsRenameModalOpen(true);
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        moveSelection(event.key);
        break;
    }
  }, [isReadOnly, isRenameModalOpen, addChildNode, addSiblingNode, deleteSelectedNodes, moveSelection, getSelectedNode]);

  return (
    <div
      style={{ width: '100%', height: '100%', background: '#fff', position: 'relative' }}
      onKeyDown={onKeyDown}
      tabIndex={0} // Make div focusable to catch key events
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClickInternal}
        onKeyDown={onKeyDown}
        fitView
        selectNodesOnDrag={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
      >
        <Background />
        <Controls />

        {!isReadOnly && (
          <Panel position="top-center">
            <Space>
              <Tooltip title="子トピックを追加 (Tab)">
                <Button
                  icon={<NodeIndexOutlined />}
                  onClick={addChildNode}
                >
                  子追加
                </Button>
              </Tooltip>
              <Tooltip title="兄弟トピックを追加 (Enter)">
                <Button
                  icon={<EnterOutlined style={{ transform: 'scaleX(-1)' }} />}
                  onClick={addSiblingNode}
                >
                  兄弟追加
                </Button>
              </Tooltip>
              <Tooltip title="削除 (Del)">
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={deleteSelectedNodes}
                />
              </Tooltip>
              {/* Fallback 'Reset/Add Root' logic could go here if list empty */}
              {nodes.length === 0 && (
                <Button icon={<PlusCircleOutlined />} onClick={() => {
                  setNodes([{ id: '1', position: { x: 0, y: 0 }, data: { label: 'Center Topic' }, type: 'input' }]);
                }}>
                  メイン追加
                </Button>
              )}
            </Space>
          </Panel>
        )}
      </ReactFlow>

      <Modal
        title="トピック名の編集"
        open={isRenameModalOpen}
        onOk={handleRenameSave}
        onCancel={() => setIsRenameModalOpen(false)}
        okText="保存"
        cancelText="キャンセル"
      >
        <Input
          ref={inputRef}
          value={editingLabel}
          onChange={(e) => setEditingLabel(e.target.value)}
          onPressEnter={handleRenameSave}
          autoFocus // Kept as backup, but ref logic is primary
        />
      </Modal>
    </div>
  );
};

const MindMapPanel: React.FC<MindMapPanelProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapContent {...props} />
    </ReactFlowProvider>
  );
};


export default MindMapPanel;