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

  const getSelectedNode = useCallback(() => {
    return getNodes().find((n) => n.selected);
  }, [getNodes]);

  const addChildNode = useCallback(() => {
    const parentNode = getSelectedNode();
    if (!parentNode) return;

    const newNodeId = Date.now().toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: parentNode.position.x + 200, y: parentNode.position.y }, // Simple offset right
      data: { label: 'New Topic' },
      type: 'default',
    };

    const newEdge: Edge = {
      id: `e${parentNode.id}-${newNodeId}`,
      source: parentNode.id,
      target: newNodeId,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);

    // Auto-open rename modal
    setEditingNodeId(newNodeId);
    setEditingLabel(newNode.data.label);
    setIsRenameModalOpen(true);
  }, [getSelectedNode, setNodes, setEdges]);

  const addSiblingNode = useCallback(() => {
    const selectedNode = getSelectedNode();
    if (!selectedNode) return;

    const parentEdge = getEdges().find((e) => e.target === selectedNode.id);
    // If no parent (root node), add sibling slightly below
    // If parent exists, add sibling linked to same parent

    const newNodeId = Date.now().toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: selectedNode.position.x, y: selectedNode.position.y + 100 }, // Simple offset down
      data: { label: 'Sibling Topic' },
      type: 'default',
    };

    setNodes((nds) => [...nds, newNode]);

    if (parentEdge) {
      const newEdge: Edge = {
        id: `e${parentEdge.source}-${newNodeId}`,
        source: parentEdge.source,
        target: newNodeId,
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    // Auto-open rename modal
    setEditingNodeId(newNodeId);
    setEditingLabel(newNode.data.label);
    setIsRenameModalOpen(true);
  }, [getSelectedNode, getEdges, setNodes, setEdges]);

  const deleteSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map(n => n.id));

    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
  }, [getNodes, setNodes, setEdges]);

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
    }
  }, [isReadOnly, isRenameModalOpen, addChildNode, addSiblingNode, deleteSelectedNodes]);

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
        nodesDraggable={!isReadOnly}
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