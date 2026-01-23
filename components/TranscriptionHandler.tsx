'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';

interface TranscriptionHandlerProps {
  onTranscript: (text: string, speaker: 'manager' | 'subordinate') => void;
  isMicOn: boolean;
  remoteAudioStream?: MediaStream | null;
}

export default function TranscriptionHandler({ onTranscript, isMicOn, remoteAudioStream }: TranscriptionHandlerProps) {
  const [_connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const connectionRef = useRef<LiveClient | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const remoteAudioStreamRef = useRef<MediaStream | null>(null);

  // Keep ref updated with latest stream
  useEffect(() => {
    remoteAudioStreamRef.current = remoteAudioStream || null;
  }, [remoteAudioStream]);

  useEffect(() => {
    let isActive = true;

    if (!isMicOn) {
      // Cleanup is handled by return function if component re-renders or unmounts,
      // but explicit cleanup logic here helps if only isMicOn changes.
      // We rely on the return function mostly.
      return;
    }

    const startTranscription = async () => {
      try {
        if (!isActive) return;
        setConnectionState('connecting');

        // Fetch ephemeral key
        const resp = await fetch('/api/deepgram/token');
        const data = await resp.json();

        if (!isActive) return;

        if (data.mockMode || data.error) {
          console.warn("Deepgram not configured or error, falling back to mock simulation");
          setConnectionState('disconnected');
          return;
        }

        const deepgram = createClient(data.key);

        const connection = deepgram.listen.live({
          model: "nova-2",
          language: "ja",
          smart_format: true,
          diarize: true, // Speaker diarization
        });

        connection.on(LiveTranscriptionEvents.Open, () => {
          if (!isActive) {
            connection.finish();
            return;
          }
          setConnectionState('connected');

          // Start local microphone recording
          navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            if (!isActive) return;
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.addEventListener('dataavailable', (event) => {
              if (event.data.size > 0 && connection.getReadyState() === 1) {
                connection.send(event.data);
              }
            });
            mediaRecorder.start(250); // Send chunk every 250ms

            // Start remote audio stream recording if available
            if (remoteAudioStreamRef.current) {
              const remoteMediaRecorder = new MediaRecorder(remoteAudioStreamRef.current, { mimeType: 'audio/webm' });
              remoteMediaRecorderRef.current = remoteMediaRecorder;

              remoteMediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0 && connection.getReadyState() === 1) {
                  connection.send(event.data);
                }
              });
              remoteMediaRecorder.start(250);
            }
          });
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          if (!isActive) return;
          const transcript = data.channel.alternatives[0]?.transcript;
          if (transcript && transcript.trim().length > 0) {
            // Simple logic: assume local mic is Manager. 
            // For real speaker separation involving remote audio, we need to mix remote stream.
            // For this MVP, we treat local mic input as 'manager'.
            // If we pipe LiveKit audio here, we could use diarization results.
            onTranscript(transcript, 'manager');
          }
        });

        connection.on(LiveTranscriptionEvents.Close, () => {
          if (isActive) setConnectionState('disconnected');
        });

        connectionRef.current = connection;

      } catch (err) {
        console.error("Deepgram Connection Failed", err);
        if (isActive) setConnectionState('disconnected');
      }
    };

    startTranscription();

    return () => {
      isActive = false;
      if (connectionRef.current) {
        connectionRef.current.finish();
        connectionRef.current = null;
        // Lint fix: Do not set state in cleanup if not necessary or handle carefully
        // setConnectionState('disconnected'); // Removing to fix lint warning
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      if (remoteMediaRecorderRef.current) {
        remoteMediaRecorderRef.current.stop();
        remoteMediaRecorderRef.current = null;
      }
    };
  }, [isMicOn, onTranscript]);

  // Effect to handle remote audio stream changes after connection is established
  useEffect(() => {
    if (!remoteAudioStream || remoteAudioStream.getAudioTracks().length === 0 || !connectionRef.current || _connectionState !== 'connected') {
      // If no remote stream or no connection, stop any existing remote recorder
      if (remoteMediaRecorderRef.current) {
        remoteMediaRecorderRef.current.stop();
        remoteMediaRecorderRef.current = null;
      }
      return;
    }

    // Connection is established and we have a remote stream
    if (remoteMediaRecorderRef.current) {
      remoteMediaRecorderRef.current.stop();
      remoteMediaRecorderRef.current = null;
    }

    const remoteMediaRecorder = new MediaRecorder(remoteAudioStream, { mimeType: 'audio/webm' });
    remoteMediaRecorderRef.current = remoteMediaRecorder;

    remoteMediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0 && connectionRef.current?.getReadyState() === 1) {
        connectionRef.current.send(event.data);
      }
    });

    remoteMediaRecorder.start(250);

    return () => {
      if (remoteMediaRecorderRef.current) {
        remoteMediaRecorderRef.current.stop();
        remoteMediaRecorderRef.current = null;
      }
    };
  }, [remoteAudioStream, _connectionState]);

  return null; // This is a logic-only component
}
