'use client';

import React from 'react';
import { Typography, Flex } from 'antd';
import { MessageOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface TranscriptMessage {
  speaker: 'manager' | 'subordinate' | string;
  text: string;
  time: string;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ messages, logEndRef }) => {
  return (
    <Flex vertical style={{ flex: 1, overflow: 'hidden' }}>
      <Text strong>
        <MessageOutlined /> Live Transcript
      </Text>
      <div style={{ marginTop: 8, flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {messages.length > 0 ? (
          messages.map((msg, idx) => (
            <Flex
              key={idx}
              vertical
              align={msg.speaker === 'manager' ? 'flex-end' : 'flex-start'}
              style={{ marginBottom: 12 }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: msg.speaker === 'manager' ? '#1890ff' : '#f0f0f0',
                  color: msg.speaker === 'manager' ? '#fff' : '#000',
                  fontSize: 14,
                }}
              >
                {msg.text}
              </div>
              <Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>
                {msg.time}
              </Text>
            </Flex>
          ))
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
            Waiting for conversation... (Speak into microphone)
          </div>
        )}
        <div ref={logEndRef} />
      </div>
    </Flex>
  );
};

export default TranscriptPanel;