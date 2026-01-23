'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Typography, Card, Descriptions, Tag, Timeline, Button, Alert, Divider, Spin } from 'antd';
import { 
  CheckCircleOutlined, 
  DownloadOutlined, 
  ShareAltOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { ReactFlow, Background, Controls, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter, useParams } from 'next/navigation';
import { useStore, Session, Subordinate, TranscriptItem } from '@/store/useStore';

type CustomNode = Node<{ label: string }>;

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function SessionSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { getSession, subordinates, sessions } = useStore();
  
  const [session, setSession] = useState<Session | null>(null);
  const [subordinate, setSubordinate] = useState<Subordinate | null>(null);

  useEffect(() => {
    if (params.id) {
        // Ensure data is loaded
        if (sessions.length === 0) {
            useStore.getState().fetchSessions();
            useStore.getState().fetchSubordinates();
        }
    }
  }, [params.id, sessions.length]);

  useEffect(() => {
    if (params.id && sessions.length > 0) {
      const s = getSession(params.id as string);
      // Only update state if session is found and different to prevent loops/warnings
      if (s && s.id !== session?.id) {
        setSession(s);
        const sub = subordinates.find(sub => sub.id === s.subordinateId) || null;
        setSubordinate(sub);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, sessions, subordinates, getSession]);

  if (!session) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /> Loading Session Data...</div>;

  const handleBackToDashboard = () => {
    router.push('/');
  };

  const defaultNodes: CustomNode[] = (session.mindMapData?.nodes as CustomNode[]) || [
     { id: '1', position: { x: 0, y: 0 }, data: { label: session.theme }, type: 'input' },
  ];
  const defaultEdges: Edge[] = session.mindMapData?.edges as Edge[] || [];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
       <Header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
             <Title level={4} style={{ margin: 0 }}>1on1 Session Summary</Title>
          </div>
          <Button icon={<HomeOutlined />} onClick={handleBackToDashboard}>Back to Dashboard</Button>
       </Header>

       <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          
          <div style={{ marginBottom: 24 }}>
             <Alert 
               message="Session Completed Successfully" 
               description="AI has analyzed the conversation and generated a summary. Please review the action items."
               type="success" 
               showIcon 
             />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
             
             {/* Left Column: Summary & Mind Map */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* AI Executive Summary */}
                <Card title="AI Executive Summary" bordered={false}>
                   <Paragraph>
                      {session.summary || "No summary generated yet."}
                   </Paragraph>
                   
                   <Title level={5}>Detected Key Topics</Title>
                   <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <Tag color="blue">Project A</Tag>
                      <Tag color="cyan">Schedule Delays</Tag>
                      <Tag color="purple">Motivation</Tag>
                   </div>

                   <Title level={5}>Suggested Action Items</Title>
                   <Timeline>
                      <Timeline.Item color="green">Schedule a follow-up meeting regarding the specs of Project A.</Timeline.Item>
                      <Timeline.Item color="blue">Share the updated roadmap documentation with {subordinate?.name}.</Timeline.Item>
                   </Timeline>
                </Card>

                {/* Mind Map Snapshot */}
                <Card title="Visual Thinking Log (Mind Map)" bordered={false} bodyStyle={{ height: 400, padding: 0 }}>
                    <div style={{ width: '100%', height: '100%' }}>
                        <ReactFlow 
                            nodes={defaultNodes} 
                            edges={defaultEdges} 
                            fitView
                            nodesDraggable={false}
                            panOnDrag={true}
                        >
                            <Background />
                            <Controls />
                        </ReactFlow>
                    </div>
                </Card>
             </div>

             {/* Right Column: Metadata & Transcript */}
             <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                <Card title="Session Details" bordered={false}>
                   <Descriptions column={1} size="small">
                      <Descriptions.Item label="Subordinate">{subordinate?.name}</Descriptions.Item>
                      <Descriptions.Item label="Date">{new Date(session.date).toLocaleDateString()}</Descriptions.Item>
                      <Descriptions.Item label="Mode">{session.mode === 'web' ? 'Web Conference' : 'Face-to-Face'}</Descriptions.Item>
                      <Descriptions.Item label="Theme">{session.theme}</Descriptions.Item>
                   </Descriptions>
                   <Divider />
                   <div style={{ display: 'flex', gap: 8 }}>
                      <Button icon={<DownloadOutlined />} block>Export PDF</Button>
                      <Button icon={<ShareAltOutlined />} block>Share</Button>
                   </div>
                </Card>

                <Card title="Full Transcript" bordered={false} bodyStyle={{ maxHeight: 500, overflowY: 'auto' }}>
                    {session.transcript && session.transcript.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {session.transcript.map((t: TranscriptItem, idx: number) => (
                                <div key={idx} style={{ padding: 8, background: t.speaker === 'manager' ? '#e6f7ff' : '#f9f9f9', borderRadius: 4 }}>
                                    <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>{t.speaker === 'manager' ? 'You' : subordinate?.name} - {t.timestamp}</div>
                                    <Text>{t.text}</Text>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Text type="secondary">No transcript data available.</Text>
                    )}
                </Card>

             </div>
          </div>
       </Content>
    </Layout>
  );
}
