'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Tag, Input, Button, Checkbox, List, Progress, Space, Divider } from 'antd';
import { UserOutlined, CheckOutlined, ClockCircleOutlined, FileTextOutlined, BulbOutlined } from '@ant-design/icons';
import type { Subordinate, Session, AgendaItem, Note } from '@/store/useStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;



interface FaceToFaceDashboardProps {
  subordinate?: Subordinate;
  sessionData?: Session;
  agendaItems: AgendaItem[];
  notes: Note[];
  elapsedTime: number; // seconds
  sessionDuration: number; // seconds (default: 60 minutes = 3600)
  timerPaused?: boolean;
  onAddNote: (content: string) => void;
  onUpdateAgenda: (items: AgendaItem[]) => void;
  onToggleTimer?: (paused: boolean) => void;
}

const FaceToFaceDashboard: React.FC<FaceToFaceDashboardProps> = ({
  subordinate,
  sessionData,
  agendaItems,
  notes,
  elapsedTime,
  sessionDuration = 3600, // 60 minutes default
  timerPaused = false,
  onAddNote,
  onUpdateAgenda,
  onToggleTimer,
}) => {
  const [newAgendaText, setNewAgendaText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  const handleAddAgenda = () => {
    if (newAgendaText.trim()) {
      const newItem: AgendaItem = {
        id: Date.now().toString(),
        text: newAgendaText.trim(),
        completed: false,
      };
      onUpdateAgenda([...agendaItems, newItem]);
      setNewAgendaText('');
    }
  };

  const handleToggleAgenda = (id: string) => {
    const updated = agendaItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdateAgenda(updated);
  };

  const handleAddNote = () => {
    if (newNoteText.trim()) {
      onAddNote(newNoteText.trim());
      setNewNoteText('');
    }
  };

  const handleToggleTimer = () => {
    const newPausedState = !timerPaused;
    onToggleTimer?.(newPausedState);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = sessionDuration > 0 ? (elapsedTime / sessionDuration) * 100 : 0;
  const remainingTime = Math.max(0, sessionDuration - elapsedTime);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: '#f5f5f5',
      overflowY: 'auto',
      padding: 16,
    }}>
      <Row gutter={[16, 16]}>
        {/* 上部: 部下プロファイル + 議題 */}
        <Col span={24}>
          <Row gutter={[16, 16]}>
            {/* 部下プロファイル */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title={
                  <Space>
                    <UserOutlined />
                    <span>部下プロファイル</span>
                  </Space>
                }
                size="small"
              >
                {subordinate ? (
                  <div>
                    <Title level={5} style={{ marginBottom: 8 }}>{subordinate.name}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                      {subordinate.role} • {subordinate.department}
                    </Text>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>特性:</Text>
                    <div style={{ marginBottom: 12 }}>
                      {subordinate.traits.map((trait, index) => (
                        <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                          {trait}
                        </Tag>
                      ))}
                    </div>
                    
                    {subordinate.lastOneOnOne && (
                      <>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>前回の1on1:</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(subordinate.lastOneOnOne).toLocaleDateString()}
                        </Text>
                      </>
                    )}
                  </div>
                ) : (
                  <Text type="secondary">部下情報を読み込み中...</Text>
                )}
              </Card>
            </Col>

            {/* 議題チェックリスト */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title={
                  <Space>
                    <CheckOutlined />
                    <span>本日の議題</span>
                  </Space>
                }
                size="small"
                extra={
                  <Button 
                    type="link" 
                    size="small"
                    onClick={handleAddAgenda}
                    disabled={!newAgendaText.trim()}
                  >
                    追加
                  </Button>
                }
              >
                <div style={{ marginBottom: 12 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input 
                      placeholder="議題を追加..."
                      value={newAgendaText}
                      onChange={(e) => setNewAgendaText(e.target.value)}
                      onPressEnter={handleAddAgenda}
                    />
                    <Button type="primary" onClick={handleAddAgenda}>
                      +
                    </Button>
                  </Space.Compact>
                </div>

                <List
                  size="small"
                  dataSource={agendaItems}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '8px 0' }}>
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleToggleAgenda(item.id)}
                        style={{ marginRight: 8 }}
                      >
                        <Text style={{ 
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? '#999' : 'inherit'
                        }}>
                          {item.text}
                        </Text>
                      </Checkbox>
                    </List.Item>
                  )}
                  locale={{ emptyText: '議題がありません。追加してください。' }}
                />
                
                {agendaItems.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary">
                      完了: {agendaItems.filter(item => item.completed).length} / {agendaItems.length}
                    </Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* セッションタイマー */}
            <Col xs={24} md={12} lg={8}>
              <Card 
                title={
                  <Space>
                    <ClockCircleOutlined />
                    <span>セッションタイマー</span>
                  </Space>
                }
                size="small"
                extra={
                  <Button 
                    type="link" 
                    size="small"
                    onClick={handleToggleTimer}
                  >
                    {timerPaused ? '再開' : '一時停止'}
                  </Button>
                }
              >
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                   <Title level={2} style={{ margin: 0, color: timerPaused ? '#999' : '#1890ff' }}>
                    {formatTime(elapsedTime)}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                     {timerPaused ? '一時停止中' : '進行中'} • 残り: {formatTime(remainingTime)}
                  </Text>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Progress 
                    percent={Math.min(progressPercentage, 100)} 
                    showInfo={false}
                     strokeColor={timerPaused ? '#d9d9d9' : '#1890ff'}
                  />
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#999',
                    marginTop: 4
                  }}>
                    <span>開始</span>
                    <span>{Math.round(progressPercentage)}%</span>
                    <span>終了</span>
                  </div>
                </div>

                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: 4,
                  padding: 8,
                  fontSize: 12
                }}>
                  <Text type="secondary">
                    {elapsedTime < 300 ? 'セッション開始直後' : 
                     progressPercentage < 30 ? '序盤: 関係構築' :
                     progressPercentage < 70 ? '中盤: 本題議論' :
                     '終盤: まとめと次回計画'}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 下部: メモ + アクションアイテム */}
        <Col span={24}>
          <Row gutter={[16, 16]}>
            {/* メモエリア */}
            <Col xs={24} lg={24}>
              <Card 
                title={
                  <Space>
                    <FileTextOutlined />
                    <span>メモ</span>
                  </Space>
                }
                size="small"
                style={{ height: '100%' }}
                extra={
                  <Button 
                    type="link" 
                    size="small"
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim()}
                  >
                    追加
                  </Button>
                }
              >
                <div style={{ marginBottom: 12 }}>
                  <TextArea 
                    placeholder="メモを入力...（Enterキーで追加）"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Button type="primary" onClick={handleAddNote}>
                      メモを追加
                    </Button>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      Ctrl+Enterでも追加できます
                    </Text>
                  </div>
                </div>

                <div style={{ 
                  flex: 1, 
                  minHeight: 200,
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  padding: 12
                }}>
                  {notes.length > 0 ? (
                    <List
                      size="small"
                      dataSource={[...notes].reverse()} // Show newest first
                      renderItem={(note) => (
                        <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ width: '100%' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              marginBottom: 4
                            }}>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {note.timestamp}
                              </Text>
                              {note.source === 'ai' && (
                                <Tag color="purple" style={{ fontSize: 10 }}>AI</Tag>
                              )}
                              {note.source === 'transcript' && (
                                <Tag color="cyan" style={{ fontSize: 10 }}>文字起こし</Tag>
                              )}
                            </div>
                            <Paragraph style={{ margin: 0, fontSize: 13 }}>
                              {note.content}
                            </Paragraph>
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: 150,
                      color: '#999'
                    }}>
                      <Text type="secondary">メモがありません</Text>
                    </div>
                  )}
                </div>
              </Card>
            </Col>


          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default FaceToFaceDashboard;