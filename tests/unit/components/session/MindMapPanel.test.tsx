import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MindMapPanel from '@/components/session/MindMapPanel';
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react';

// Common stubs for React Flow hooks
const mockGetNodes = vi.fn<() => any[]>(() => []);
const mockGetEdges = vi.fn<() => any[]>(() => []);

// Mock @xyflow/react
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlow: ({
      children,
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeDoubleClick
    }: {
      children?: React.ReactNode;
      nodes?: unknown[];
      edges?: unknown[];
      onNodesChange?: unknown;
      onEdgesChange?: unknown;
      onConnect?: (params: unknown) => void;
      onNodeDoubleClick?: (event: React.MouseEvent, node: unknown) => void;
    }) => (
      <div
        data-testid="react-flow"
        data-nodes-count={(nodes || []).length}
        data-edges-count={(edges || []).length}
      >
        {children}
        {onConnect && <button onClick={() => onConnect({ source: '1', target: '2' })}>Simulate connect</button>}
        {onNodeDoubleClick && <button onClick={(e) => onNodeDoubleClick(e, { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'test' } })}>Simulate node double click</button>}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
    useReactFlow: () => ({
      getNodes: mockGetNodes,
      getEdges: mockGetEdges,
    }),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

// Mock antd Modal to avoid JSDOM/Animation issues
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>();
  return {
    ...actual,
    Modal: ({ children, open, onCancel, title, okText, cancelText, onOk }: any) => {
      if (!open) return null;
      return (
        <div role="dialog" aria-modal="true">
          <div>{title}</div>
          {children}
          <button onClick={onCancel}>{cancelText || 'Cancel'}</button>
          <button onClick={onOk}>{okText || 'OK'}</button>
        </div>
      );
    }
  };
});

// Mock @xyflow/react/dist/style.css
vi.mock('@xyflow/react/dist/style.css', () => ({}));

describe('MindMapPanel', () => {
  const mockNodes: Node<{ label: string }>[] = [
    { id: '1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Topic 1' }, selected: true },
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
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();

  const defaultProps = {
    nodes: mockNodes,
    edges: mockEdges,
    onNodesChange: mockOnNodesChange,
    onEdgesChange: mockOnEdgesChange,
    onConnect: mockOnConnect,
    onNodeDoubleClick: mockOnNodeDoubleClick,
    handleAddNode: mockHandleAddNode,
    setNodes: mockSetNodes,
    setEdges: mockSetEdges,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNodes.mockReturnValue(mockNodes);
    mockGetEdges.mockReturnValue(mockEdges);

    // Mock getComputedStyle to avoid Ant Design/JSDOM errors
    Object.defineProperty(window, 'getComputedStyle', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        getPropertyValue: vi.fn(),
      })),
    });
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

  it('should render toolbar buttons', () => {
    render(<MindMapPanel {...defaultProps} />);
    expect(screen.getByText('子追加')).toBeInTheDocument();
    expect(screen.getByText('兄弟追加')).toBeInTheDocument();
  });

  it('should call setNodes when "Child Add" button is clicked', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const addChildBtn = screen.getByText('子追加');
    await user.click(addChildBtn);

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockSetEdges).toHaveBeenCalled();
  });

  it('should call setNodes when "Sibling Add" button is clicked', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const addSiblingBtn = screen.getByText('兄弟追加');
    await user.click(addSiblingBtn);

    expect(mockSetNodes).toHaveBeenCalled();
  });

  // Since we replaced the external "Add Topic" button with internal logic or removed it, 
  // we check if we handle empty state correctly or if the button is gone from `top: 10`
  // The new code only shows "Main Add" if nodes.length === 0.
  it('should show "Main Add" button when no nodes exist', async () => {
    const emptyProps = { ...defaultProps, nodes: [] };
    mockGetNodes.mockReturnValue([]);
    render(<MindMapPanel {...emptyProps} />);

    expect(screen.getByText('メイン追加')).toBeInTheDocument();
  });


  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);
    const container = screen.getByTestId('react-flow').parentElement;

    // Focus container
    container?.focus();

    // Tab -> Add Child
    fireEvent.keyDown(container!, { key: 'Tab' });
    expect(mockSetNodes).toHaveBeenCalled();

    // Auto-opened modal should be present, close it to continue testing
    expect(await screen.findByText('トピック名の編集')).toBeInTheDocument();

    // Note: We need to wait for state update if not immediate, currently it seems synchronous enough or we assume it
    const cancelBtn = screen.getByText('キャンセル');
    fireEvent.click(cancelBtn);
    await waitFor(() => expect(screen.queryByText('トピック名の編集')).not.toBeInTheDocument());

    // Enter -> Add Sibling
    fireEvent.keyDown(container!, { key: 'Enter' });
    expect(mockSetNodes).toHaveBeenCalledTimes(2);

    // Close modal again
    expect(await screen.findByText('トピック名の編集')).toBeInTheDocument();
    const cancelBtn2 = screen.getByText('キャンセル');
    fireEvent.click(cancelBtn2);
    await waitFor(() => expect(screen.queryByText('トピック名の編集')).not.toBeInTheDocument());

    // Delete -> Delete Selected
    fireEvent.keyDown(container!, { key: 'Delete' });
    expect(mockSetNodes).toHaveBeenCalledTimes(3);
  });

  it('should open modal and rename node on double click', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    // Simulate double click on a node
    // Note: We need to trigger the double click via the simulated button in our mock
    // because we can't easily click a real node in jsdom with ReactFlow.
    const doubleClickBtn = screen.getByText('Simulate node double click');
    await user.click(doubleClickBtn);

    // Modal should appear safely
    // Antd Modal uses portals, so check for text in the document
    expect(await screen.findByText('トピック名の編集')).toBeInTheDocument();

    // Find input and change value
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Renamed Topic');

    // Click Save
    // Ant Design might perform auto-spacing for 2-char CJK buttons (e.g. "保 存")
    const saveBtn = screen.getByRole('button', { name: /保存|保\s+存/ });
    await user.click(saveBtn);

    // Check if setNodes was called
    expect(mockSetNodes).toHaveBeenCalled();
    // We can't easily check the structure of the setState callback without more complex mocking,
    // but knowing it was called after "Save" is good signals.
  });

  it('should auto-open modal when adding a child node', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    // Click Add Child button
    const addChildBtn = screen.getByText('子追加');
    await user.click(addChildBtn);

    // Modal should appear automatically
    expect(await screen.findByText('トピック名の編集')).toBeInTheDocument();

    // Check initial value
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('New Topic');

    // Verify focus is requested (mocked)
    // In JSDOM with our manual focus call + timeout, this might be tricky to test perfectly without timers.
    // But we can check if document.activeElement is the input.
    // We need to wait for the timeout in the component
    await waitFor(() => {
      expect(input).toHaveFocus();
    }, { timeout: 2000 });
  });
});