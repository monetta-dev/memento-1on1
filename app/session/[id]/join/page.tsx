'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout, Typography, Spin, notification, Card } from 'antd';
import { Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useRouter } from 'next/navigation';

import SessionHeader from '@/components/session/SessionHeader';
import VideoPanel from '@/components/session/VideoPanel';
import MindMapPanel from '@/components/session/MindMapPanel';
import SubordinateControlsBar from '../../../../components/session/SubordinateControlsBar';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

const { Content, Sider } = Layout;

type CustomNode = Node<{ label: string }>;

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessions = useStore(state => state.sessions);
  const subordinates = useStore(state => state.subordinates);
  const fetchSessions = useStore(state => state.fetchSessions);
  const fetchSubordinates = useStore(state => state.fetchSubordinates);

  const [isMindMapMode, setIsMindMapMode] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const prevRemoteStreamRef = useRef<MediaStream | null>(null);

  const hasFetchedRef = useRef<string | null>(null);

  // Debug log for mindmap mode
  useEffect(() => {
    if (hasFetchedRef.current === params.id) return;
    
    try {
      fetchSessions();
      fetchSubordinates();
      hasFetchedRef.current = params.id as string;
    } catch (error) {
      console.error('Error fetching session data:', error);
    }
  }, [params.id, fetchSessions, fetchSubordinates]);

  const sessionData = useMemo(() => {
    return sessions.find(s => s.id === params.id);
  }, [sessions, params.id]);

  const subordinate = useMemo(() => {
    if (!sessionData) return undefined;
    return subordinates.find(s => s.id === sessionData.subordinateId);
  }, [sessionData, subordinates]);



  const handleRemoteAudioTrack = useCallback((stream: MediaStream | null) => {
    const prevStream = prevRemoteStreamRef.current;
    if ((!stream && !prevStream) || (stream && prevStream && stream.id === prevStream.id)) {
      return;
    }
    prevRemoteStreamRef.current = stream;
    setRemoteAudioStream(stream);
  }, []);

  const handleTranscript = useCallback((_: string, __: 'manager' | 'subordinate') => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Subordinate view doesn't need to handle transcripts
  }, []);

  // Load mindmap data from session
  const initialNodes: CustomNode[] = useMemo(() => {
    if (sessionData?.mindMapData?.nodes) {
      return sessionData.mindMapData.nodes as CustomNode[];
    }
    return [{ id: '1', position: { x: 0, y: 0 }, data: { label: '1on1 Session' }, type: 'input' }];
  }, [sessionData]);

  const initialEdges: Edge[] = useMemo(() => {
    if (sessionData?.mindMapData?.edges) {
      return sessionData.mindMapData.edges;
    }
    return [];
  }, [sessionData]);

  // MindMap state - read-only for subordinate
  const [nodes, setNodes] = useNodesState<CustomNode>(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Realtime subscription for mindmap updates
  useEffect(() => {
    if (!sessionData?.id || !supabase) return;

    const channel = supabase
      .channel(`session-${sessionData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionData.id}`,
        },
        (payload) => {
          // Handle mindmap updates
          const newMindMapData = payload.new.mind_map_data;
          if (newMindMapData && newMindMapData.nodes) {
            console.log('📡 Received mindmap update:', {
              nodesCount: newMindMapData.nodes.length,
              edgesCount: newMindMapData.edges?.length || 0,
              newMindMapData
            });
            setNodes(newMindMapData.nodes);
            setEdges(newMindMapData.edges || []);
          }
          
          // Handle session status changes
          const newStatus = payload.new.status;
          if (newStatus === 'completed') {
            notification.info({
              message: 'Session Ended',
              description: 'The manager has ended the session. You will be redirected in 5 seconds.',
              placement: 'topRight',
              duration: 5,
            });
            
            // Redirect to dashboard after 5 seconds
            setTimeout(() => {
              router.push('/');
            }, 5000);
          }
        }
      );

    // Subscribe and handle errors
    channel.subscribe((status, err) => {
       if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription error:', err);
        notification.error({
          message: 'Connection Error',
          description: 'Failed to connect to realtime updates. Please refresh the page.',
          placement: 'topRight',
          duration: 5,
        });
       } else if (status === 'SUBSCRIBED') {
        } else if (status === 'CLOSED') {
       }
    });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [sessionData?.id, setNodes, setEdges, router]);

  // Update mindmap when session data changes
  useEffect(() => {
    if (sessionData?.mindMapData) {
      setNodes(sessionData.mindMapData.nodes as CustomNode[]);
      setEdges(sessionData.mindMapData.edges || []);
    }
  }, [sessionData?.mindMapData, setNodes, setEdges]);

  if (!sessionData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin>Loading session...</Spin>
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <SessionHeader 
        subordinate={subordinate} 
        sessionData={sessionData} 
        isSubordinateView={true}
      />

      <Layout>
        {/* Main Content: Video / MindMap */}
        <Content style={{ 
          flex: isMindMapMode ? 1 : 3, 
          background: '#000', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            {isMindMapMode ? (
              <MindMapPanel
                nodes={nodes}
                edges={edges}
                onNodesChange={() => {}} // Read-only
                onEdgesChange={() => {}} // Read-only
                onConnect={() => {}} // Read-only
                onNodeDoubleClick={() => {}} // Read-only
                handleAddNode={() => {}} // Read-only
                isReadOnly={true}
              />
            ) : (
              <VideoPanel
                sessionData={sessionData}
                micOn={micOn}
                remoteAudioStream={remoteAudioStream}
                onTranscript={handleTranscript}
                onRemoteAudioTrack={handleRemoteAudioTrack}
                username={subordinate?.name || "Subordinate"}
              />
            )}
          </div>

          <SubordinateControlsBar
            micOn={micOn}
            setMicOn={setMicOn}
            isMindMapMode={isMindMapMode}
            setIsMindMapMode={setIsMindMapMode}
            onLeaveSession={() => router.push('/')}
          />
        </Content>

        {/* Right Side: Minimal info panel - hidden in mindmap mode */}
        {!isMindMapMode && (
           <Sider width={300} theme="light" style={{ 
            borderLeft: '1px solid #f0f0f0', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%'
          }}>
            <Card
              title="Session Info"
              size="small"
              variant="outlined"
              style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column'
              }}
              styles={{
                body: { 
                  flex: 1, 
                  minHeight: 0, 
                  padding: '16px',
                  overflowY: 'auto'
                }
              }}
            >
              <Typography.Paragraph>
                You are participating in a 1on1 session as <strong>{subordinate?.name || 'Subordinate'}</strong>.
              </Typography.Paragraph>
              
              <div style={{ marginTop: 20 }}>
                <Typography.Text strong>Theme:</Typography.Text>
                <Typography.Paragraph>{sessionData.theme}</Typography.Paragraph>
              </div>

              <div style={{ marginTop: 20 }}>
                <Typography.Text strong>Instructions:</Typography.Text>
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  <li>Toggle between video and mindmap view using the buttons below</li>
                  <li>Mindmap is synchronized with your manager&apos;s view</li>
                  <li>Your microphone is {micOn ? 'ON' : 'OFF'}</li>
                </ul>
              </div>
            </Card>
          </Sider>
        )}
      </Layout>
    </Layout>
  );
}