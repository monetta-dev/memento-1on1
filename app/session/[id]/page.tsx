'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout, Button, Typography, Tag, Alert, notification, Spin } from 'antd';
import {
  AudioOutlined, AudioMutedOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  BulbOutlined, PartitionOutlined,
  MessageOutlined, PlusCircleOutlined
} from '@ant-design/icons';
import { ReactFlow, Background, Controls, Node, Edge, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';

type CustomNode = Node<{ label: string }>;
import '@xyflow/react/dist/style.css'; // Importing here to ensure it loads
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';


import LiveKitComponent from '@/components/LiveKitComponent';
import TranscriptionHandler from '@/components/TranscriptionHandler';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

// Mock Data for Simulation (Kept for fallback logic if needed)
const MOCK_ADVICES = [
  "部下の話を遮らず、最後まで聞きましょう。",
  "「何か手伝えることは？」とオープンに問いかけてみてください。",
];

const initialNodes: CustomNode[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: '1on1 Theme: Project A' }, type: 'input' },
];
const initialEdges: Edge[] = [];

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  console.log('SessionPage rendering, params.id:', params.id);
  // Select state and actions with shallow comparison to avoid unnecessary re-renders
  const sessions = useStore(state => state.sessions);
  const subordinates = useStore(state => state.subordinates);
  const updateSession = useStore(state => state.updateSession);
  const fetchSessions = useStore(state => state.fetchSessions);
  const fetchSubordinates = useStore(state => state.fetchSubordinates);
  console.log('Store selected - sessions:', sessions.length, 'subordinates:', subordinates.length, 'fetchSessions:', !!fetchSessions, 'fetchSubordinates:', !!fetchSubordinates);

  // Session State
  const [messages, setMessages] = useState<{ speaker: string, text: string, time: string }[]>([]);
  const [isMindMapMode, setIsMindMapMode] = useState(false);
  const [micOn, setMicOn] = useState(true); // Re-introduce mic control for transcription handling
  const isAnalyzingRef = useRef<boolean>(false);
  const lastAdviceTimeRef = useRef<number>(0);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const prevRemoteStreamRef = useRef<MediaStream | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  const handleTranscript = useCallback((text: string, speaker: 'manager' | 'subordinate') => {
    const newMessage = {
      speaker,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleRemoteAudioTrack = useCallback((stream: MediaStream | null) => {
    // Skip update if stream is effectively the same
    const prevStream = prevRemoteStreamRef.current;
    if ((!stream && !prevStream) || (stream && prevStream && stream.id === prevStream.id)) {
      return;
    }
    prevRemoteStreamRef.current = stream;
    setRemoteAudioStream(stream);
  }, []);

  // Track if we've fetched for this session ID
  const hasFetchedRef = useRef<string | null>(null);



  // Fetch session data on mount or when session ID changes
  useEffect(() => {
    // Skip if already fetched this session
    if (hasFetchedRef.current === params.id) {
      console.log('Already fetched session data for:', params.id);
      return;
    }

    console.log('Fetching session data for:', params.id);

    try {
      fetchSessions();
      fetchSubordinates();
      hasFetchedRef.current = params.id as string;
      console.log('Fetch initiated for session:', params.id);
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const sessionData = useMemo(() => {
    const data = sessions.find(s => s.id === params.id);
    console.log('sessionData calculated:', !!data, 'sessions count:', sessions.length, 'params.id:', params.id);
    return data;
  }, [sessions, params.id]);

  const subordinate = useMemo(() => {
    if (!sessionData) {
      console.log('subordinate calculated: undefined (no sessionData)');
      return undefined;
    }
    const sub = subordinates.find(s => s.id === sessionData.subordinateId);
    console.log('subordinate calculated:', !!sub, 'subordinates count:', subordinates.length, 'sessionData.subordinateId:', sessionData.subordinateId);
    return sub;
  }, [sessionData, subordinates]);

  // Trigger real-time AI advice based on conversation
  useEffect(() => {
    const fetchRealTimeAdvice = async () => {
      if (isAnalyzingRef.current || messages.length < 3) return; // Need minimum conversation
      if (Date.now() - lastAdviceTimeRef.current < 30000) return; // Throttle: min 30 seconds between calls

      isAnalyzingRef.current = true;
      try {
        const recentMessages = messages.slice(-10); // Last 10 messages

        // Use memoized sessionData and subordinate instead of finding them again
        const response = await fetch('/api/chat/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: recentMessages,
            theme: sessionData?.theme || 'General Check-in',
            subordinateTraits: subordinate?.traits || []
          })
        });

        if (!response.ok) throw new Error('API call failed');

        const data = await response.json();
        if (data.advice) {
          lastAdviceTimeRef.current = Date.now();
          notification.info({
            message: 'AI Coach Advice',
            description: data.advice,
            placement: 'topRight',
            icon: <BulbOutlined style={{ color: '#1890ff' }} />,
            duration: 6,
          });
        }
      } catch (error) {
        console.error('Failed to fetch AI advice:', error);
        // Fallback to mock advice
        const mockAdvice = MOCK_ADVICES[Math.floor(Math.random() * MOCK_ADVICES.length)];
        notification.info({
          message: 'AI Coach Advice',
          description: mockAdvice,
          placement: 'topRight',
          icon: <BulbOutlined style={{ color: '#1890ff' }} />,
          duration: 4,
        });
      } finally {
        isAnalyzingRef.current = false;
      }
    };

    // Trigger AI analysis when enough messages accumulated and enough time passed
    if (messages.length >= 3 && Date.now() - lastAdviceTimeRef.current > 30000) {
      fetchRealTimeAdvice();
    }
  }, [messages, sessionData, subordinate]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // MindMap state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleAddNode = useCallback(() => {
    const newNodeId = (nodes.length + 1).toString();
    const newNode: CustomNode = {
      id: newNodeId,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'New Topic' }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes]);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Could implement node editing on double click
    console.log('Node double-clicked:', node);
  }, []);

  const [isEnding, setIsEnding] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // エラーキャッチ用のエフェクト
  useEffect(() => {
    console.log('SessionPage useEffect - sessionData:', sessionData, 'subordinate:', subordinate);
  }, [sessionData, subordinate]);

  const handleEndSession = async () => {
    console.log('handleEndSession called, params.id:', params.id);
    setIsEnding(true);
    try {
      // 1. Prepare transcript data
      const transcriptData = messages.map(m => ({
        speaker: m.speaker as 'manager' | 'subordinate',
        text: m.text,
        timestamp: m.time
      }));
      console.log('Transcript data prepared:', transcriptData.length, 'messages');

      // 2. Call AI summary API
      let summary = "Automatic summary generated by AI based on the session transcript. The discussion focused on project delays and managing stakeholder expectations.";
      let actionItems: string[] = ["Schedule a follow-up meeting regarding the specs of Project A.", "Share the updated roadmap documentation."];
      
      try {
        console.log('Calling AI summary API...');
        const response = await fetch('/api/chat/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcriptData,
            theme: sessionData?.theme || 'General Check-in'
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('AI summary API response:', data);
          if (data.summary) {
            summary = data.summary;
          }
          if (Array.isArray(data.actionItems)) {
            actionItems = data.actionItems;
          }
        } else {
          console.warn('AI summary API returned non-OK status:', response.status);
        }
      } catch (error) {
        console.error('Failed to generate AI summary:', error);
        // Continue with default summary
      }

      // 3. Save data to store
      const currentSessionData = sessions.find(s => s.id === params.id);
      console.log('Current session data found:', !!currentSessionData, 'sessions count:', sessions.length);
      if (currentSessionData) {
        console.log('Updating session in store...');
        await updateSession(currentSessionData.id, {
          status: 'completed',
          transcript: transcriptData,
          summary: summary,
          mindMapData: {
            nodes: nodes,
            edges: edges,
            actionItems: actionItems
          }
        });
        console.log('Session updated in store');
      } else {
        console.error('Current session data not found for id:', params.id);
      }

      // 4. Redirect to summary page
      console.log('Redirecting to summary page:', `/session/${params.id}/summary`);
      router.push(`/session/${params.id}/summary`);
    } catch (error) {
      console.error('Error ending session:', error);
      notification.error({
        message: 'Failed to End Session',
        description: 'Please try again.',
        placement: 'topRight'
      });
    } finally {
      setIsEnding(false);
      console.log('handleEndSession finished');
    }
  };



  if (!sessionData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin>Loading session data...</Spin>
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            1on1 with {subordinate?.name || 'Subordinate'}
          </Title>
          <Tag color="blue">{sessionData?.theme}</Tag>
          <Tag color={sessionData?.mode === 'web' ? 'cyan' : 'green'}>{sessionData?.mode === 'web' ? 'Web Mode' : 'Face-to-Face'}</Tag>
        </div>
        <div>
          <Text type="secondary">{new Date().toDateString()}</Text>
        </div>
      </Header>

      <Layout>
        {/* Left Side: Video / Visuals */}
        <Content style={{ flex: 2, background: '#000', position: 'relative', display: 'flex', flexDirection: 'column' }}>
           <TranscriptionHandler isMicOn={micOn} onTranscript={handleTranscript} remoteAudioStream={remoteAudioStream} />

          {isMindMapMode ? (
            <div style={{ width: '100%', height: '100%', background: '#fff', position: 'relative' }}>
               <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
                 <Button icon={<PlusCircleOutlined />} onClick={handleAddNode}>Add Topic</Button>
               </div>
               <ReactFlow 
                 nodes={nodes} 
                 edges={edges} 
                 onNodesChange={onNodesChange}
                 onEdgesChange={onEdgesChange}
                 onConnect={onConnect}
                 onNodeDoubleClick={onNodeDoubleClick}
                 nodesDraggable
                 nodesConnectable
                 elementsSelectable
                 fitView
               >
                 <Background />
                 <Controls />
               </ReactFlow>
            </div>
           ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
              {/* LiveKit Component replaces the mock video UI */}
              {sessionData ? (
                <LiveKitComponent
                  roomName={`session-${sessionData.id}`}
                  username="Manager" // In real app, get from auth context
                  mode={sessionData.mode}
                  onRemoteAudioTrack={handleRemoteAudioTrack}
                />
              ) : (
                <div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Initializing Session...</div>
              )}
            </div>
          )}

          {/* Controls Bar */}
          <div style={{ height: 60, background: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {/* Add back Mic toggle for Deepgram control */}
            <Button
              shape="circle"
              icon={micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
              type={micOn ? 'default' : 'primary'}
              danger={!micOn}
              onClick={() => setMicOn(!micOn)}
            />

            <Button
              type="default"
              shape="round"
              icon={isMindMapMode ? <VideoCameraOutlined /> : <PartitionOutlined />}
              onClick={() => setIsMindMapMode(!isMindMapMode)}
            >
              {isMindMapMode ? 'Switch to Video' : 'Switch to MindMap'}
            </Button>

             <Button type="primary" danger shape="round" icon={<PhoneOutlined />} onClick={handleEndSession} loading={isEnding}>
               End Session
             </Button>
          </div>
        </Content>

        {/* Right Side: AI Copilot & Transcript */}
        <Sider width={400} theme="light" style={{ borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            <Title level={5} style={{ margin: 0 }}><BulbOutlined style={{ color: '#faad14' }} /> AI Copilot</Title>
          </div>

          <div style={{ padding: 16, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Live Advice Area */}
            <Alert
              message="Real-time Advice"
              description="Keep listening. The subordinate seems to be hesitating about the project schedule."
              type="info"
              showIcon
              style={{ border: '1px solid #91caff', background: '#e6f7ff' }}
            />

            <div style={{ marginTop: 16 }}>
              <Text strong><MessageOutlined /> Live Transcript</Text>
              <div style={{ marginTop: 8 }}>
                {messages.length > 0 ? messages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: msg.speaker === 'manager' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: msg.speaker === 'manager' ? '#1890ff' : '#f0f0f0',
                      color: msg.speaker === 'manager' ? '#fff' : '#000',
                      fontSize: 14
                    }}>
                      {msg.text}
                    </div>
                    <Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>{msg.time}</Text>
                  </div>
                )) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                    Waiting for conversation... (Speak into microphone)
                  </div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </Sider>
      </Layout>
    </Layout>
  );
}
