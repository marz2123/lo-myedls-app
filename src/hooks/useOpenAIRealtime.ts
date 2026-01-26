import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeMessage {
  type: string;
  role?: 'user' | 'assistant';
  content?: string;
  transcript?: string;
}

interface UseOpenAIRealtimeOptions {
  onMessage?: (message: RealtimeMessage) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  instructions?: string;
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
}

export const useOpenAIRealtime = (options: UseOpenAIRealtimeOptions = {}) => {
  const {
    onMessage,
    onTranscript,
    onError,
    onConnectionChange,
    onSpeakingChange,
    instructions,
    voice = 'alloy'
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Cleanup function
  const disconnect = useCallback(() => {
    console.log('[Realtime] Disconnecting...');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    
    setIsConnected(false);
    setIsSpeaking(false);
    onConnectionChange?.(false);
  }, [onConnectionChange]);

  // Connect to OpenAI Realtime API via WebRTC
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    console.log('[Realtime] Starting connection...');

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStreamRef.current = stream;
      console.log('[Realtime] Microphone access granted');

      // Get ephemeral token from edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('openai-realtime-token', {
        body: { instructions, voice }
      });

      if (tokenError || !tokenData?.client_secret?.value) {
        throw new Error(tokenError?.message || 'Failed to get ephemeral token');
      }

      const ephemeralKey = tokenData.client_secret.value;
      console.log('[Realtime] Got ephemeral token');

      // Create audio element for playback
      if (!audioElRef.current) {
        audioElRef.current = document.createElement('audio');
        audioElRef.current.autoplay = true;
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up remote audio playback
      pc.ontrack = (e) => {
        console.log('[Realtime] Received remote track');
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[Realtime] Data channel opened');
        setIsConnected(true);
        setIsConnecting(false);
        onConnectionChange?.(true);
      };

      dc.onclose = () => {
        console.log('[Realtime] Data channel closed');
        disconnect();
      };

      dc.onerror = (error) => {
        console.error('[Realtime] Data channel error:', error);
        onError?.(new Error('Data channel error'));
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log('[Realtime] Event:', event.type);

          switch (event.type) {
            case 'response.audio.delta':
              if (!isSpeaking) {
                setIsSpeaking(true);
                onSpeakingChange?.(true);
              }
              break;

            case 'response.audio.done':
              setIsSpeaking(false);
              onSpeakingChange?.(false);
              break;

            case 'conversation.item.input_audio_transcription.completed':
              const userTranscript = event.transcript;
              if (userTranscript) {
                setLastTranscript(userTranscript);
                onTranscript?.(userTranscript, true);
                onMessage?.({ type: 'user_transcript', role: 'user', transcript: userTranscript });
              }
              break;

            case 'response.audio_transcript.delta':
              onTranscript?.(event.delta, false);
              break;

            case 'response.audio_transcript.done':
              if (event.transcript) {
                onMessage?.({ type: 'assistant_transcript', role: 'assistant', transcript: event.transcript });
              }
              break;

            case 'response.done':
              console.log('[Realtime] Response completed');
              break;

            case 'error':
              console.error('[Realtime] Server error:', event.error);
              onError?.(new Error(event.error?.message || 'Server error'));
              break;
          }
        } catch (err) {
          console.error('[Realtime] Failed to parse event:', err);
        }
      };

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Connect to OpenAI Realtime API
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      console.log('[Realtime] WebRTC connection established');

    } catch (error) {
      console.error('[Realtime] Connection error:', error);
      setIsConnecting(false);
      disconnect();
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }, [isConnecting, isConnected, instructions, voice, disconnect, onConnectionChange, onError, onMessage, onTranscript, onSpeakingChange, isSpeaking]);

  // Send text message
  const sendMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.error('[Realtime] Data channel not ready');
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };

    dcRef.current.send(JSON.stringify(event));
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    lastTranscript,
    connect,
    disconnect,
    sendMessage
  };
};
