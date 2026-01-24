'use client';

import React from 'react';
import LiveKitComponent from '@/components/LiveKitComponent';
import TranscriptionHandler from '@/components/TranscriptionHandler';

interface SessionData {
  id: string;
  theme: string;
  mode: 'web' | 'face-to-face';
  subordinateId: string;
}

interface VideoPanelProps {
  sessionData?: SessionData;
  micOn: boolean;
  remoteAudioStream: MediaStream | null;
  onTranscript: (text: string, speaker: 'manager' | 'subordinate') => void;
  onRemoteAudioTrack: (stream: MediaStream | null) => void;
  username?: string;
}

const VideoPanel: React.FC<VideoPanelProps> = ({
  sessionData,
  micOn,
  remoteAudioStream,
  onTranscript,
  onRemoteAudioTrack,
  username = "Manager",
}) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <TranscriptionHandler 
        isMicOn={micOn} 
        onTranscript={onTranscript} 
        remoteAudioStream={remoteAudioStream} 
      />
      
      {sessionData ? (
        <LiveKitComponent
          roomName={`session-${sessionData.id}`}
          username={username}
          mode={sessionData.mode}
          onRemoteAudioTrack={onRemoteAudioTrack}
        />
      ) : (
        <div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>
          Initializing Session...
        </div>
      )}
    </div>
  );
};

export default VideoPanel;