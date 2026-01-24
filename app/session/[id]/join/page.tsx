'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout, Typography, Spin } from 'antd';
import { Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams } from 'next/navigation';

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
  const sessions = useStore(state => state.sessions);
  const subordinates = useStore(state => state.subordinates);
  const fetchSessions = useStore(state => state.fetchSessions);
  const fetchSubordinates = useStore(state => state.fetchSubordinates);

  const [isMindMapMode, setIsMindMapMode] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
  const prevRemoteStreamRef = useRef<MediaStream | null>(null);

  const hasFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasFetchedRef.current === params.id) return;
    
    console.log('Fetching session data for subordinate join:', params.id);
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

  const handleTranscript = useCallback((text: string, speaker: 'manager' | 'subordinate') => {
    // Subordinate view doesn't need to handle transcripts
    console.log('Transcript received:', { text, speaker });
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

    const subscription = supabase
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
          const newMindMapData = payload.new.mind_map_data;
          if (newMindMapData && newMindMapData.nodes && newMindMapData.edges) {
            setNodes(newMindMapData.nodes);
            setEdges(newMindMapData.edges || []);
            console.log('Mindmap updated via realtime');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionData?.id, setNodes, setEdges]);

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
        <Content style={{ flex: 3, background: '#000', position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
            />
          )}

          <SubordinateControlsBar
            micOn={micOn}
            setMicOn={setMicOn}
            isMindMapMode={isMindMapMode}
            setIsMindMapMode={setIsMindMapMode}
          />
        </Content>

        {/* Right Side: Minimal info panel */}
        <Sider width={300} theme="light" style={{ borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Session Info</Typography.Title>
          </div>

          <div style={{ padding: 16, flex: 1 }}>
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
          </div>
        </Sider>
      </Layout>
    </Layout>
  );
}