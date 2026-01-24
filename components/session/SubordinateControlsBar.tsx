'use client';

import React from 'react';
import { Button, Flex } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  PartitionOutlined,
} from '@ant-design/icons';

interface SubordinateControlsBarProps {
  micOn: boolean;
  setMicOn: (micOn: boolean) => void;
  isMindMapMode: boolean;
  setIsMindMapMode: (isMindMapMode: boolean) => void;
}

const SubordinateControlsBar: React.FC<SubordinateControlsBarProps> = ({
  micOn,
  setMicOn,
  isMindMapMode,
  setIsMindMapMode,
}) => {
  return (
    <Flex 
      justify="center" 
      align="center" 
      gap={24}
      style={{ 
        height: 60, 
        background: '#1f1f1f',
        padding: '0 24px'
      }}
    >
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
    </Flex>
  );
};

export default SubordinateControlsBar;