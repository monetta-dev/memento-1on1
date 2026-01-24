import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TranscriptionHandler from '@/components/TranscriptionHandler';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock @deepgram/sdk
const { mockCreateClient, mockListenLive, mockLiveClient } = vi.hoisted(() => {
  const mockLiveClient = {
    on: vi.fn(),
    finish: vi.fn(),
    send: vi.fn(),
    getReadyState: vi.fn(),
  };
  const mockListenLive = vi.fn(() => mockLiveClient);
  const mockCreateClient = vi.fn(() => ({
    listen: { live: mockListenLive },
  }));
  return { mockCreateClient, mockListenLive, mockLiveClient };
});

vi.mock('@deepgram/sdk', () => ({
  createClient: mockCreateClient,
  LiveTranscriptionEvents: {
    Open: 'open',
    Transcript: 'transcript',
    Close: 'close',
  },
}));



// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock MediaRecorder
const mockMediaRecorderInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  ondataavailable: null,
  onerror: null,
  onstart: null,
  onstop: null,
  state: 'inactive' as 'inactive' | 'recording' | 'paused',
  stream: null as MediaStream | null,
  mimeType: '',
};

const mockMediaRecorder = vi.fn((stream?: MediaStream) => {
  mockMediaRecorderInstance.stream = stream || null;
  return mockMediaRecorderInstance;
});
global.MediaRecorder = mockMediaRecorder as typeof MediaRecorder;

describe('TranscriptionHandler', () => {
  const defaultProps = {
    onTranscript: vi.fn(),
    isMicOn: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset MediaRecorder mock instance
    mockMediaRecorderInstance.start.mockClear();
    mockMediaRecorderInstance.stop.mockClear();
    mockMediaRecorderInstance.addEventListener.mockClear();
    mockMediaRecorderInstance.removeEventListener.mockClear();
    mockMediaRecorderInstance.dispatchEvent.mockClear();
    mockMediaRecorderInstance.state = 'inactive';
    mockMediaRecorderInstance.stream = null;
    
    // Clear all mock implementations
    mockLiveClient.on.mockClear();
    mockGetUserMedia.mockClear();
    mockFetch.mockClear();
    
    // Default mock implementations
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'test-dg-token', mockMode: false }),
    });
    
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as MediaStream);
    
    mockLiveClient.getReadyState.mockReturnValue(1); // OPEN
    mockLiveClient.on.mockImplementation((event, callback) => {
      // Store callback for later invocation
      if (event === 'open') {
        setTimeout(() => callback(), 0);
      }
      return mockLiveClient;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch ephemeral token and create Deepgram connection when isMicOn is true', async () => {
    render(<TranscriptionHandler {...defaultProps} />);
    
    // Wait for async effects
    await act(async () => {
      await Promise.resolve(); // Allow microtasks to run
    });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/deepgram/token');
    expect(mockCreateClient).toHaveBeenCalledWith({ accessToken: 'test-dg-token' });
    expect(mockListenLive).toHaveBeenCalledWith({
      model: 'nova-2',
      language: 'ja',
      smart_format: true,
      diarize: true,
    });
  });

  it('should not start transcription when isMicOn is false', async () => {
    render(<TranscriptionHandler {...defaultProps} isMicOn={false} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('should handle mock mode when Deepgram API is not configured', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mockMode: true, error: 'Deepgram API Key not configured' }),
    });
    
    render(<TranscriptionHandler {...defaultProps} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    
    expect(mockCreateClient).not.toHaveBeenCalled();
    // Connection state should remain disconnected
  });

  it('should handle Deepgram token fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<TranscriptionHandler {...defaultProps} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('should start local microphone recording when connection opens', async () => {
    let openCallback: (() => void) | null = null;
    mockLiveClient.on.mockImplementation((event, callback) => {
      if (event === 'open') {
        openCallback = callback;
      }
      return mockLiveClient;
    });
    
    render(<TranscriptionHandler {...defaultProps} />);
    
    // Verify Deepgram connection was established
    await act(async () => {
      await Promise.resolve(); // Allow useEffect to run
    });
    
    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockListenLive).toHaveBeenCalled();
    expect(mockLiveClient.on).toHaveBeenCalledWith('open', expect.any(Function));
    
    // Trigger open event
    await act(async () => {
      if (openCallback) openCallback();
      // Wait for any pending promises and microtasks
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(MediaRecorder).toHaveBeenCalled();
  });

  it('should handle transcript events and call onTranscript', async () => {
    let transcriptCallback: ((data: unknown) => void) | null = null;
    mockLiveClient.on.mockImplementation((event, callback) => {
      if (event === 'transcript') {
        transcriptCallback = callback;
      }
      if (event === 'open') {
        // Auto-open to allow transcription
        setTimeout(() => callback(), 0);
      }
      return mockLiveClient;
    });
    
    const mockOnTranscript = vi.fn();
    render(<TranscriptionHandler {...defaultProps} onTranscript={mockOnTranscript} />);
    
    // Wait for open event
    await act(async () => {
      await Promise.resolve();
    });
    
    // Simulate transcript event
    const transcriptData = {
      channel: {
        alternatives: [{
          transcript: 'Hello world',
        }],
      },
    };
    
    await act(async () => {
      if (transcriptCallback) transcriptCallback(transcriptData);
      await Promise.resolve();
    });
    
    expect(mockOnTranscript).toHaveBeenCalledWith('Hello world', 'manager');
  });

  it('should ignore empty transcripts', async () => {
    let transcriptCallback: ((data: unknown) => void) | null = null;
    mockLiveClient.on.mockImplementation((event, callback) => {
      if (event === 'transcript') {
        transcriptCallback = callback;
      }
      if (event === 'open') {
        setTimeout(() => callback(), 0);
      }
      return mockLiveClient;
    });
    
    const mockOnTranscript = vi.fn();
    render(<TranscriptionHandler {...defaultProps} onTranscript={mockOnTranscript} />);
    
    await act(async () => {
      await Promise.resolve();
    });
    
    const transcriptData = {
      channel: {
        alternatives: [{
          transcript: '   ', // Whitespace only
        }],
      },
    };
    
    await act(async () => {
      if (transcriptCallback) transcriptCallback(transcriptData);
      await Promise.resolve();
    });
    
    expect(mockOnTranscript).not.toHaveBeenCalled();
  });

  it('should start remote audio stream recording when remoteAudioStream is provided', async () => {
    let openCallback: (() => void) | null = null;
    mockLiveClient.on.mockImplementation((event, callback) => {
      if (event === 'open') {
        openCallback = callback;
      }
      return mockLiveClient;
    });
    
    const mockRemoteStream = {
      getAudioTracks: () => [{ stop: vi.fn() }],
    } as MediaStream;

    render(<TranscriptionHandler {...defaultProps} remoteAudioStream={mockRemoteStream} />);
    
    // Verify Deepgram connection was established
    await act(async () => {
      await Promise.resolve(); // Allow useEffect to run
    });
    
    expect(mockCreateClient).toHaveBeenCalled();
    expect(mockListenLive).toHaveBeenCalled();
    expect(mockLiveClient.on).toHaveBeenCalledWith('open', expect.any(Function));
    
    // Trigger open event
    await act(async () => {
      if (openCallback) openCallback();
      // Wait for any pending promises and microtasks
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    // Should create MediaRecorder for both local and remote streams
    console.log('MediaRecorder calls:', MediaRecorder.mock.calls.length, MediaRecorder.mock.calls);
    expect(MediaRecorder).toHaveBeenCalledTimes(2); // local + remote
  });

  it('should handle remote audio stream changes after connection is established', async () => {
    let openCallback: (() => void) | null = null;
    mockLiveClient.on.mockImplementation((event, callback) => {
      if (event === 'open') {
        openCallback = callback;
      }
      return mockLiveClient;
    });

    // First render without remote stream
    const { rerender } = render(<TranscriptionHandler {...defaultProps} />);

    // Wait for connection setup
    await act(async () => {
      await Promise.resolve();
    });

    // Trigger open event
    await act(async () => {
      if (openCallback) openCallback();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Reset mock to clear previous calls count
    MediaRecorder.mockClear();

    // Now rerender with remote stream
    const mockRemoteStream = {
      getAudioTracks: () => [{ stop: vi.fn() }],
    } as MediaStream;

    rerender(<TranscriptionHandler {...defaultProps} remoteAudioStream={mockRemoteStream} />);

    // Wait for effect to run
    await act(async () => {
      await Promise.resolve();
    });

    // Should create MediaRecorder for remote stream only (local already created)
    expect(MediaRecorder).toHaveBeenCalledTimes(1);
  });

  it('should cleanup resources on unmount', async () => {
    const { unmount } = render(<TranscriptionHandler {...defaultProps} />);
    
    // Trigger open event to set up connection
    await act(async () => {
      mockLiveClient.on.mock.calls.forEach(([event, callback]) => {
        if (event === 'open') callback();
      });
      await Promise.resolve();
    });
    
    unmount();
    
    expect(mockLiveClient.finish).toHaveBeenCalled();
    // MediaRecorder.stop should be called via cleanup
  });
});