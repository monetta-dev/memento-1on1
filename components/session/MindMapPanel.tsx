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
import { getLayoutedElements } from './layoutUtils';

type CustomNode = Node<{ label: string }>;

interface MindMapPanelProps {
  nodes: CustomNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<CustomNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (params: Connection) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: CustomNode) => void; // Made optional and renamed in destructuring
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
  onNodeDoubleClick: externalOnNodeDoubleClick, // Rename to distinguish
  // handleAddNode, // Using internal handlers for more control
  setNodes,
  setEdges,
  isReadOnly = false,
}) => {
  const { getNodes, getEdges } = useReactFlow();

  // Renaming state
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const inputRef = useRef<InputRef>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isRenameModalOpen) {
      // Small delay to ensure Modal animation/mounting doesn't interfere with focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRenameModalOpen]);

  // Auto-layout effect
  // We need to run layout when nodes/edges count changes or structure updates.
  // To avoid loops with onNodesChange, we might want to run this only when we strictly add/remove
  // or use a separate effect that detects structural changes.
  // For simplicity and robustness given "no manual move", we can enforce layout whenever nodes/edges differ from a layouted state.
  // However, running it on every render/change can be heavy.
  // Let's wrap adding nodes with layout calculation instead.

  // NOTE: Integrating layout into the add/delete functions is cleaner than a purely reactive useEffect 
  // that might fight with React Flow's internal state if not careful.

  const applyAutoLayout = useCallback((currentNodes: CustomNode[], currentEdges: Edge[]) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      currentNodes,
      currentEdges
    );
    // We cast back to CustomNode[] assuming dagre doesn't lose our data structure
    setNodes([...layoutedNodes] as CustomNode[]);
    setEdges([...layoutedEdges]);
  }, [setNodes, setEdges]);

  // Initial layout on mount if needed (or if data loaded from external source)
  // useEffect(() => {
  //   if (nodes.length > 0) {
  //      applyAutoLayout(nodes, edges);
  //   }
  // }, []); 
  // Keep it simple: Apply layout when modifying structure.

  const getSelectedNode = useCallback(() => {
    return getNodes().find((n) => n.selected);
  }, [getNodes]);

  const addChildNode = useCallback(() => {
    const parentNode = getSelectedNode();
    if (!parentNode) return;

    const newNodeId = Date.now().toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: 0, y: 0 }, // Position will be handled by auto-layout
      data: { label: 'New Topic' },
      type: 'default',
    };

    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNodeId}`,
      source: parentNode.id,
      target: newNodeId,
    };

    const updatedNodes = [...getNodes(), newNode] as CustomNode[];
    const updatedEdges = [...getEdges(), newEdge];

    applyAutoLayout(updatedNodes, updatedEdges);

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

    const updatedNodes = [...getNodes(), newNode] as CustomNode[];
    applyAutoLayout(updatedNodes, updatedEdges);

    // Auto-open rename modal
    setEditingNodeId(newNodeId);
    setEditingLabel(newNode.data.label);
    setIsRenameModalOpen(true);
  }, [getSelectedNode, getNodes, getEdges, applyAutoLayout]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map(n => n.id));

    const remainingNodes = getNodes().filter((n) => !selectedIds.has(n.id)) as CustomNode[];
    const remainingEdges = getEdges().filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target));

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

  const handleRenameSave = useCallback(() => {
    if (editingNodeId) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId) {
            return {
              ...node,
              data: { ...node.data, label: editingLabel }
            };
          }
          return node;
        })
      );
    }
    setIsRenameModalOpen(false);
    setEditingNodeId(null);
    setEditingLabel('');
  }, [editingNodeId, editingLabel, setNodes]);

  const moveSelection = useCallback((key: string) => {
    const selectedNode = getSelectedNode();
    if (!selectedNode) return;

    const currentNodes = getNodes();
    const currentEdges = getEdges();

    let nextNodeId: string | undefined;

    if (key === 'ArrowLeft') {
      // Navigate to parent
      const parentEdge = currentEdges.find(e => e.target === selectedNode.id);
      if (parentEdge) {
        nextNodeId = parentEdge.source;
      }
    } else if (key === 'ArrowRight') {
      // Navigate to first child (middle preferred or top)
      // Let's sort children by Y to be consistent
      const childEdges = currentEdges.filter(e => e.source === selectedNode.id);
      if (childEdges.length > 0) {
        const childNodes = currentNodes.filter(n => childEdges.some(e => e.target === n.id));
        childNodes.sort((a, b) => a.position.y - b.position.y);
        // Select the middle one for better UX, or just the first
        const middleIndex = Math.floor(childNodes.length / 2);
        nextNodeId = childNodes[middleIndex].id;
      }
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      // Navigate between siblings
      const parentEdge = currentEdges.find(e => e.target === selectedNode.id);

      let siblings: CustomNode[] = [];
      if (parentEdge) {
        // Has parent, find other children of same parent
        const siblingEdges = currentEdges.filter(e => e.source === parentEdge.source);
        siblings = currentNodes.filter(n => siblingEdges.some(e => e.target === n.id));
      } else {
        // Root nodes (no incoming edges)
        // Identify all root nodes
        const nonRootIds = new Set(currentEdges.map(e => e.target));
        siblings = currentNodes.filter(n => !nonRootIds.has(n.id));
      }

      // Sort by Y
      siblings.sort((a, b) => a.position.y - b.position.y);

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
    }
  }, [getNodes, getEdges, getSelectedNode, setNodes]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (isReadOnly || isRenameModalOpen) return;

    // We only want to handle keys when focusing the flow container or nothing input-like
    // But for simplicity in this task, let's assume global flow focus or check activeElement
    const activeElement = document.activeElement;
    const isInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
    if (isInput) return;

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        addChildNode();
        break;
      case 'Enter':
        event.preventDefault();
        addSiblingNode();
        break;
      case 'Backspace':
      case 'Delete':
        event.preventDefault(); // Prevent browser back navigation
        deleteSelectedNodes();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        moveSelection(event.key);
        break;
    }
  }, [isReadOnly, isRenameModalOpen, addChildNode, addSiblingNode, deleteSelectedNodes, moveSelection]);

  return (
    <div
      style={{ width: '100%', height: '100%', background: '#fff', position: 'relative' }}
      onKeyDown={onKeyDown}
      tabIndex={0} // Make div focusable to catch key events
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isReadOnly ? undefined : onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onNodeDoubleClick={isReadOnly ? undefined : onNodeDoubleClickInternal}
        nodesDraggable={false} // Disable manual dragging
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
        fitView
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