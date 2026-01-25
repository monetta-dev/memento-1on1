'use client';

import React from 'react';
import { Button, Flex } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  PartitionOutlined,
  PhoneOutlined,
} from '@ant-design/icons';

interface ControlsBarProps {
  micOn: boolean;
  setMicOn: (micOn: boolean) => void;
  isMindMapMode: boolean;
  setIsMindMapMode: (isMindMapMode: boolean) => void;
  handleEndSession: () => Promise<void>;
  isEnding: boolean;
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  micOn,
  setMicOn,
  isMindMapMode,
  setIsMindMapMode,
  handleEndSession,
  isEnding,
}) => {
  return (
    <div style={{ position: 'relative', zIndex: 1000 }}>
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

       <Button
        type="primary"
        danger
        shape="round"
        icon={<PhoneOutlined />}
        onClick={() => {
          console.log('ControlsBar: End Session button clicked');
          handleEndSession();
        }}
        loading={isEnding}
      >
        End Session
       </Button>
     </Flex>
   </div>
 );
};

export default ControlsBar;