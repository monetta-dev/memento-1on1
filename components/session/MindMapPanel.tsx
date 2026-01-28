'use client';

import React from 'react';
import { ReactFlow, Background, Controls, Node, Edge, Connection, OnNodesChange, OnEdgesChange } from '@xyflow/react';
import { Button } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import '@xyflow/react/dist/style.css';

type CustomNode = Node<{ label: string }>;

interface MindMapPanelProps {
  nodes: CustomNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<CustomNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (params: Connection) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: CustomNode) => void;
  handleAddNode: () => void;
  isReadOnly?: boolean;
}

const MindMapPanel: React.FC<MindMapPanelProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDoubleClick,
  handleAddNode,
  isReadOnly = false,
}) => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', position: 'relative' }}>
      {!isReadOnly && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <Button icon={<PlusCircleOutlined />} onClick={handleAddNode}>
             トピック追加
          </Button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isReadOnly ? undefined : onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onNodeDoubleClick={isReadOnly ? undefined : onNodeDoubleClick}
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable={!isReadOnly}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default MindMapPanel;