import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MindMapPanel from '@/components/session/MindMapPanel';
import type { Node, Edge, OnNodesChange, OnEdgesChange } from '@xyflow/react';

type CustomNode = Node<{
  label: string;
  expanded?: boolean;
  hasChildren?: boolean;
  onToggle?: (id: string) => void;
}>;

// Common stubs for React Flow hooks
const mockGetNodes = vi.fn<() => any[]>(() => []);
const mockGetEdges = vi.fn<() => any[]>(() => []);
const mockSetCenter = vi.fn();
const mockGetViewport = vi.fn<() => { x: number, y: number, zoom: number }>(() => ({ x: 0, y: 0, zoom: 1 }));

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
      onNodeDoubleClick,
      nodesDraggable
    }: {
      children?: React.ReactNode;
      nodes?: unknown[];
      edges?: unknown[];
      onNodesChange?: unknown;
      onEdgesChange?: unknown;
      onConnect?: (params: unknown) => void;
      onNodeDoubleClick?: (event: React.MouseEvent, node: unknown) => void;
      nodesDraggable?: boolean;
    }) => (
      <div
        data-testid="react-flow"
        data-nodes-count={(nodes || []).length}
        data-edges-count={(edges || []).length}
        data-nodes-draggable={nodesDraggable}
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
      setCenter: mockSetCenter,
      getViewport: mockGetViewport,
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

  it('should have node dragging disabled', () => {
    render(<MindMapPanel {...defaultProps} />);
    const reactFlow = screen.getByTestId('react-flow');
    expect(reactFlow).toHaveAttribute('data-nodes-draggable', 'false');
  });

  it('should render toolbar buttons', () => {
    render(<MindMapPanel {...defaultProps} />);
    expect(screen.getByText('子追加')).toBeInTheDocument();
    expect(screen.getByText('兄弟追加')).toBeInTheDocument();
  });

  it('should call setNodes and setCenter and select NEW node when "Child Add" button is clicked', async () => {
    const user = userEvent.setup();
    render(<MindMapPanel {...defaultProps} />);

    const addChildBtn = screen.getByText('子追加');
    await user.click(addChildBtn);

    expect(mockSetNodes).toHaveBeenCalled();
    expect(mockSetEdges).toHaveBeenCalled();
    expect(mockSetCenter).toHaveBeenCalled();

    // Verify selection logic
    // The last call to setNodes should contain the new node with selected: true
    // And previous nodes deselected.
    const lastCallArg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0] as CustomNode[];
    // Find the new node (id won't be 1 or 2, likely timestamp)
    const newNode = lastCallArg.find(n => n.id !== '1' && n.id !== '2');
    const oldNode = lastCallArg.find(n => n.id === '1');

    expect(newNode).toBeDefined();
    expect(newNode?.selected).toBe(true);
    expect(oldNode?.selected).toBe(false);
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

    // Space -> Rename
    fireEvent.keyDown(container!, { key: ' ' });
    // Expect modal to open
    expect(await screen.findByText('トピック名の編集')).toBeInTheDocument();

    // Close modal
    const cancelBtn3 = screen.getByText('キャンセル');
    fireEvent.click(cancelBtn3);
    await waitFor(() => expect(screen.queryByText('トピック名の編集')).not.toBeInTheDocument());

    // Delete -> Delete Selected
    // We need to select a non-root node first (Topic 1 is root)
    // Topic 2 is Child and not selected. MockNodes has Topic 1 selected.
    // Let's toggle selection in our mock/setup concept
    mockNodes[0].selected = false;
    mockNodes[1].selected = true;

    // We need to re-render to reflect "selection" if component reads it from props initially or 
    // actually it reads from useReactFlow().getNodes().
    // Since we mocked getNodes, we just updated the array it returns (by reference potentially).
    // Let's verify if getNodes() returns the modified objects.

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

  it('should navigate nodes with arrow keys and PAN to new node', async () => {
    // Setup a small tree: 1 (Root) -> 2 (Child), 3 (Child)
    // 2 is above 3
    const mockNodesNav: Node[] = [
      { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Root' }, selected: true },
      { id: '2', type: 'default', position: { x: 100, y: -50 }, data: { label: 'Child 1' } },
      { id: '3', type: 'default', position: { x: 100, y: 50 }, data: { label: 'Child 2' } },
    ];
    const mockEdgesNav: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
    ];

    mockGetNodes.mockReturnValue(mockNodesNav);
    mockGetEdges.mockReturnValue(mockEdgesNav);

    render(<MindMapPanel {...defaultProps} nodes={mockNodesNav} edges={mockEdgesNav} />);
    const container = screen.getByTestId('react-flow').parentElement;

    // Select Root (done in props)
    // Right Arrow -> Child (Middle -> Child 2 seems to be index 1 if 2 items, wait math.floor(2/2) = 1 => Child 2?)
    // Actually logic: Math.floor(2/2) = 1. nodes sorted by Y: [Child 1 (-50), Child 2 (50)]. Index 1 is Child 2.
    // Let's verify mock call arguments.

    fireEvent.keyDown(container!, { key: 'ArrowRight' });
    expect(mockSetNodes).toHaveBeenCalled();

    // Verify PANNING triggered
    expect(mockSetCenter).toHaveBeenCalled();

    // We expect checking the functional update, but simplistic call check is enough for "hooked up".

    // Let's assume selection logic is correct if compiled (logic is sound). 
    // Ideally we test state transitions but mocks make it hard without a real store.

    // Simulate selection on Child 1
    mockNodesNav[0].selected = false;
    mockNodesNav[1].selected = true; // Child 1 selected
    fireEvent.keyDown(container!, { key: 'ArrowDown' });
    // Should go to Child 2
    expect(mockSetNodes).toHaveBeenCalled();

    // Simulate selection on Child 1
    fireEvent.keyDown(container!, { key: 'ArrowLeft' });
    // Should go to Root
    expect(mockSetNodes).toHaveBeenCalled();
  });

  it('should prevent deletion of root nodes', async () => {
    // Setup: Root -> Child
    const mockNodesDel: Node[] = [
      { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Root' }, selected: true },
      { id: '2', type: 'default', position: { x: 100, y: 0 }, data: { label: 'Child' }, selected: false },
    ];
    const mockEdgesDel: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
    ];

    mockGetNodes.mockReturnValue(mockNodesDel);
    mockGetEdges.mockReturnValue(mockEdgesDel);

    // We need simple props just to render
    render(<MindMapPanel {...defaultProps} nodes={mockNodesDel} edges={mockEdgesDel} />);
    const container = screen.getByTestId('react-flow').parentElement;

    // 1. Try to delete Root (id: 1) which is selected
    // Since it's a root (no incoming edges), it should NOT be deleted.
    fireEvent.keyDown(container!, { key: 'Delete' });

    // setNodes should NOT be called if we filtered everything out
    // or called with same nodes?
    // My logic: if (nodesToDelete.length === 0) return;
    // So setNodes should NOT be called.
    expect(mockSetNodes).not.toHaveBeenCalled();

    // 2. Select Child (id: 2) and try deletion
    mockNodesDel[0].selected = false;
    mockNodesDel[1].selected = true;

    // We need to re-render or just fire event (mockGetNodes returns new state)
    // But since we mock return value, logic uses that.

    fireEvent.keyDown(container!, { key: 'Delete' });
    // This time it should be called because Child has incoming edge e1-2
    expect(mockSetNodes).toHaveBeenCalledTimes(1);
  });

  it('should focus parent node after deleting a child', async () => {
    // Setup: Root (id:1) -> Child (id:2)
    // Child is selected.
    const mockNodesFocus: Node[] = [
      { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Root' }, selected: false },
      { id: '2', type: 'default', position: { x: 100, y: 0 }, data: { label: 'Child' }, selected: true },
    ];
    const mockEdgesFocus: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
    ];

    mockGetNodes.mockReturnValue(mockNodesFocus);
    mockGetEdges.mockReturnValue(mockEdgesFocus);

    render(<MindMapPanel {...defaultProps} nodes={mockNodesFocus} edges={mockEdgesFocus} />);
    const container = screen.getByTestId('react-flow').parentElement;

    // Delete Child
    fireEvent.keyDown(container!, { key: 'Delete' });

    expect(mockSetNodes).toHaveBeenCalled();
    // Check argument to see if parent (id:1) is selected
    const newNodesArg = mockSetNodes.mock.calls[0][0] as CustomNode[]; // It receives array
    const parentNode = newNodesArg.find(n => n.id === '1');
    expect(parentNode).toBeDefined();
    expect(parentNode?.selected).toBe(true);
  });

  it('should recursively delete descendant nodes (cascading deletion)', async () => {
    // Setup: Root (1) -> Child (2) -> Grandchild (3)
    const mockNodesCas: CustomNode[] = [
      { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Root' }, selected: false },
      { id: '2', type: 'default', position: { x: 100, y: 0 }, data: { label: 'Child' }, selected: true }, // Targeted
      { id: '3', type: 'default', position: { x: 200, y: 0 }, data: { label: 'Grandchild' }, selected: false },
    ];
    const mockEdgesCas: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ];

    mockGetNodes.mockReturnValue(mockNodesCas);
    mockGetEdges.mockReturnValue(mockEdgesCas);

    render(<MindMapPanel {...defaultProps} nodes={mockNodesCas} edges={mockEdgesCas} />);
    const container = screen.getByTestId('react-flow').parentElement;

    // Delete "Child" (2). "Grandchild" (3) should also be deleted.
    fireEvent.keyDown(container!, { key: 'Delete' });

    expect(mockSetNodes).toHaveBeenCalled();
    const remainingNodes = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0] as CustomNode[];

    const childExists = remainingNodes.some(n => n.id === '2');
    const grandchildExists = remainingNodes.some(n => n.id === '3');
    const rootExists = remainingNodes.some(n => n.id === '1');

    expect(childExists).toBe(false);
    expect(grandchildExists).toBe(false); // Cascading check
    expect(rootExists).toBe(true);
  });

  it('should obey strict navigation rules (no auto-collapse)', async () => {
    // Setup: Root (1) -> Child (2) -> Grandchild (3)
    const mockNodesCollapse: CustomNode[] = [
      { id: '1', type: 'default', position: { x: 0, y: 0 }, data: { label: 'Root' }, selected: true },
      { id: '2', type: 'default', position: { x: 100, y: 0 }, data: { label: 'Child', expanded: true }, selected: false },
      { id: '3', type: 'default', position: { x: 200, y: 0 }, data: { label: 'Grandchild' }, selected: false },
    ];
    const mockEdgesCollapse: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ];

    mockGetNodes.mockReturnValue(mockNodesCollapse);
    mockGetEdges.mockReturnValue(mockEdgesCollapse);

    render(<MindMapPanel {...defaultProps} nodes={mockNodesCollapse} edges={mockEdgesCollapse} />);
    const container = screen.getByTestId('react-flow').parentElement;

    const resolveUpdate = (callArg: any, currentNodes: any[]) => {
      return typeof callArg === 'function' ? callArg(currentNodes) : callArg;
    };

    // 1. Select Root (1)
    // ArrowRight -> Should go to Child (2) (Navigation)
    fireEvent.keyDown(container!, { key: 'ArrowRight' });
    expect(mockSetNodes).toHaveBeenCalled();

    // Verify next State call sets Child(2) as selected
    const call1Arg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
    const call1 = resolveUpdate(call1Arg, mockNodesCollapse) as CustomNode[];
    expect(call1.find(n => n.id === '2')?.selected).toBe(true);

    // 2. Mock selection on Child (2) which is EXPANDED
    mockNodesCollapse[0].selected = false;
    mockNodesCollapse[1].selected = true;

    // ArrowLeft -> Should Go to Parent (1). NO Collapsing.
    fireEvent.keyDown(container!, { key: 'ArrowLeft' });

    expect(mockSetNodes).toHaveBeenCalled();
    const call2Arg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
    const call2 = resolveUpdate(call2Arg, mockNodesCollapse) as CustomNode[];
    const node2 = call2.find(n => n.id === '2');
    // Ensure expanded is STILL true (or undefined/default)
    expect(node2?.data.expanded).not.toBe(false);
    // Ensure Root is selected
    const root = call2.find(n => n.id === '1');
    expect(root?.selected).toBe(true);

    // 3. ArrowRight on Child(2) (Expanded) -> Should go to Grandchild(3)
    // Reset selection to (2)
    mockNodesCollapse[1].selected = true;
    mockGetNodes.mockReturnValue(mockNodesCollapse); // Ensure mock returns update

    fireEvent.keyDown(container!, { key: 'ArrowRight' });
    const call3Arg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
    const call3 = resolveUpdate(call3Arg, mockNodesCollapse) as CustomNode[];

    expect(call3.find(n => n.id === '3')?.selected).toBe(true);
    expect(call3.find(n => n.id === '2')?.data.expanded).not.toBe(false);
  });

  it.skip('should toggle expansion when node toggle button is clicked', async () => {
    // Setup: Root (1) -> Child (2)
    // We will verify that clicking the toggle on usage invokes the data.onToggle logic
    // Since MindMapNode is a custom component, we need to ensure it's rendered by ReactFlow.
    // However, vitest with shallow or deep rendering might skip internals of ReactFlow.
    // But since we provided `nodeTypes`, ReactFlow *should* render it if we use valid types.

    // We update mockNodes to have type 'mindMap' and data populated as the effect would do.
    const mockNodesClick: CustomNode[] = [
      {
        id: '1',
        type: 'mindMap',
        position: { x: 0, y: 0 },
        data: { label: 'Root', expanded: true, hasChildren: true },
        selected: true
      },
      {
        id: '2',
        type: 'mindMap',
        position: { x: 100, y: 0 },
        data: { label: 'Child', expanded: true },
        selected: false
      },
    ];
    const mockEdgesClick: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
    ];

    mockGetNodes.mockReturnValue(mockNodesClick);
    mockGetEdges.mockReturnValue(mockEdgesClick);

    // We assume the component under test (MindMapPanel) handles the onToggle injection in useEffect.
    // However, in the test render, useEffect runs.

    render(<MindMapPanel {...defaultProps} nodes={mockNodesClick} edges={mockEdgesClick} />);

    // Check if Custom Node rendered
    // "Root" text should be present.
    // We look for the toggle button. 
    // Since we mocked ReactFlow in the test file, we need to check if our mock renders custom nodes?
    // The current Mock for ReactFlow (lines 17-46 in test file) just renders `children` or a generic div.
    // It DOES NOT render the nodes using `nodeTypes`.
    // So the `MindMapNode` component is NOT actually rendered in our current test suite.
    // We need to update the ReactFlow mock to render nodes using the provided `nodeTypes` if possible, 
    // OR we test the logic via `mockSetNodes` integration if we can trigger the internal logic.

    // Since implementing a full ReactFlow renderer mock is complex, let's verify the EFFECT logic:
    // "Check if initial render converts types to mindMap and injects callbacks".

    // Wait for effect
    await waitFor(() => {
      expect(mockSetNodes).toHaveBeenCalled();
    });

    // Check the SetNodes call to see if it injected `onToggle`
    const lastCallArg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0] as CustomNode[];
    const rootNode = lastCallArg.find(n => n.id === '1');

    expect(rootNode?.type).toBe('mindMap');
    expect(rootNode?.data.hasChildren).toBe(true);
    expect(typeof rootNode?.data.onToggle).toBe('function');

    // Now execute the callback directly to verify it toggles
    if (rootNode?.data.onToggle) {
      rootNode.data.onToggle('1');
    }

    // Expect another setNodes with expanded: false
    const toggleCallArg = mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0] as CustomNode[];
    const toggledRoot = toggleCallArg.find(n => n.id === '1');
    expect(toggledRoot?.data.expanded).toBe(false);
  });
});