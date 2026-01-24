import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MindMapPanel from '@/components/session/MindMapPanel';
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react';

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ 
    children, 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    onNodeDoubleClick
  }: Record<string, unknown>) => (
    <div 
      data-testid="react-flow" 
      data-nodes-count={(nodes as Array<unknown>).length}
      data-edges-count={(edges as Array<unknown>).length}
    >
      {children}
      {onNodesChange && <button onClick={() => onNodesChange([{ type: 'remove', id: 'test' }])}>Simulate node change</button>}
      {onEdgesChange && <button onClick={() => onEdgesChange([{ type: 'remove', id: 'test' }])}>Simulate edge change</button>}
      {onConnect && <button onClick={() => onConnect({ source: '1', target: '2' })}>Simulate connect</button>}
      {onNodeDoubleClick && <button onClick={(e) => onNodeDoubleClick(e, { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'test' } })}>Simulate node double click</button>}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
}));

// Mock @xyflow/react/dist/style.css
vi.mock('@xyflow/react/dist/style.css', () => ({}));

describe('MindMapPanel', () => {
  const mockNodes: Node<{ label: string }>[] = [
    { id: '1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Topic 1' } },
    { id: '2', type: 'default', position: { x: 200, y: 200 }, data: { label: 'Topic 2' } },
  ];
  
  const mockEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2' },
  ];
  
  const mockOnNodesChange: OnNodesChange = vi.fn();
  const mockOnEdgesChange: OnEdgesChange = vi.fn();
  const mockOnConnect = vi.fn();
  const mockOnNodeDoubleClick = vi.fn();
  const mockHandleAddNode = vi.fn();

  const defaultProps = {
    nodes: mockNodes,
    edges: mockEdges,
    onNodesChange: mockOnNodesChange,
    onEdgesChange: mockOnEdgesChange,
    onConnect: mockOnConnect,
    onNodeDoubleClick: mockOnNodeDoubleClick,
    handleAddNode: mockHandleAddNode,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with nodes and edges', () => {
    render(<MindMapPanel {...defaultProps} />);

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-nodes-count', '2');
    expect(reactFlow).toHaveAttribute('data-edges-count', '1');
  });

  it('should render "Add Topic" button', () => {
    render(<MindMapPanel {...defaultProps} />);

    expect(screen.getByText('Add Topic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Topic/ })).toBeInTheDocument();
  });

  it('should call handleAddNode when "Add Topic" button is clicked', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /Add Topic/ });
    await user.click(addButton);

    expect(mockHandleAddNode).toHaveBeenCalledTimes(1);
  });

  it('should pass onNodesChange callback to ReactFlow', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const simulateButton = screen.getByText('Simulate node change');
    await user.click(simulateButton);

    expect(mockOnNodesChange).toHaveBeenCalledWith([{ type: 'remove', id: 'test' }]);
  });

  it('should pass onEdgesChange callback to ReactFlow', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const simulateButton = screen.getByText('Simulate edge change');
    await user.click(simulateButton);

    expect(mockOnEdgesChange).toHaveBeenCalledWith([{ type: 'remove', id: 'test' }]);
  });

  it('should pass onConnect callback to ReactFlow', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const simulateButton = screen.getByText('Simulate connect');
    await user.click(simulateButton);

    expect(mockOnConnect).toHaveBeenCalledWith({ source: '1', target: '2' });
  });

  it('should pass onNodeDoubleClick callback to ReactFlow', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const simulateButton = screen.getByText('Simulate node double click');
    await user.click(simulateButton);

    expect(mockOnNodeDoubleClick).toHaveBeenCalled();
  });

  it('should render with empty nodes', () => {
    const propsWithEmptyNodes = {
      ...defaultProps,
      nodes: [],
      edges: [],
    };
    
    render(<MindMapPanel {...propsWithEmptyNodes} />);

    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-nodes-count', '0');
    expect(reactFlow).toHaveAttribute('data-edges-count', '0');
  });
});