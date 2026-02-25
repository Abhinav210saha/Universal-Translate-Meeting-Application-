/// <reference types="vite/client" />
import React, { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  GridLayout,
  ParticipantTile,
  useTracks,
  ControlBar,
} from '@livekit/components-react';
import { DataPacket_Kind, LocalParticipant, RemoteParticipant, RoomEvent, Track } from 'livekit-client';
import { useAppStore } from '../store';
import { translateText } from '../lib/gemini';
import { SubtitleOverlay } from './SubtitleOverlay';
import '@livekit/components-styles';

interface VideoRoomProps {
  token: string;
  onLeave: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({ token, onLeave }) => {
  const { spokenLanguage, targetLanguage } = useAppStore();
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const getSanitizedUrl = () => {
    // Try both process.env and import.meta.env
    let url = (import.meta.env.VITE_LIVEKIT_URL || process.env.LIVEKIT_URL || "")?.trim().replace(/\/$/, "");
    if (!url) return null;
    
    // If it starts with http/https, convert to ws/wss
    if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
    if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
    
    // If no protocol, assume wss
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      url = `wss://${url}`;
    }
    return url;
  };

  const serverUrl = getSanitizedUrl();
  
  useEffect(() => {
    console.log("--- LiveKit Connection Debug ---");
    console.log("Raw LIVEKIT_URL from env:", process.env.LIVEKIT_URL);
    console.log("Sanitized Server URL:", serverUrl);
    console.log("Token present:", !!token);
    if (token) console.log("Token length:", token.length);
    console.log("--------------------------------");
  }, [serverUrl, token]);

  if (!serverUrl) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white p-8 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Configuration Missing</h2>
          <p className="text-zinc-400 mb-6">LIVEKIT_URL is not configured. Please add it to your AI Studio Secrets.</p>
          <button onClick={onLeave} className="px-8 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all font-semibold">
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white p-8 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-red-500">Connection Failed</h2>
          <div className="bg-white/5 p-4 rounded-xl mb-6 text-left">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">Error Message</p>
            <p className="text-zinc-300 font-mono text-sm break-all">{error}</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              This usually means the <code className="bg-white/10 px-1 rounded text-emerald-400">LIVEKIT_URL</code> is unreachable or blocked.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-3 bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all font-semibold shadow-lg shadow-emerald-500/20"
              >
                Try Again
              </button>
              <button 
                onClick={onLeave} 
                className="w-full py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all font-semibold"
              >
                Back to Lobby
              </button>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Technical Details</p>
              <p className="text-[10px] text-zinc-500 break-all">URL: {serverUrl}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
      <LiveKitRoom
        video={false} // Start with video off to avoid immediate permission issues
        audio={false} // Start with audio off
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={() => {
          console.log("Disconnected from room");
          // Don't auto-redirect immediately, maybe it's a temporary glitch
          // But for now let's just log it. If it's a permanent disconnect, 
          // the user will see the empty room or we can set an error.
        }}
        onError={(e) => {
          console.error("LiveKit Room Error:", e);
          setError(e.message);
        }}
        data-lk-theme="default"
        className="h-full"
      >
        <RoomContent 
          spokenLanguage={spokenLanguage} 
          targetLanguage={targetLanguage}
          transcriptions={transcriptions}
          setTranscriptions={setTranscriptions}
          onLeave={onLeave}
        />
      </LiveKitRoom>
    </div>
  );
};

const RoomContent: React.FC<{
  spokenLanguage: string;
  targetLanguage: string;
  transcriptions: Record<string, string>;
  setTranscriptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLeave: () => void;
}> = ({ spokenLanguage, targetLanguage, transcriptions, setTranscriptions, onLeave }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Handle incoming data packets (transcriptions)
  useEffect(() => {
    const handleData = (payload: Uint8Array, participant?: RemoteParticipant | LocalParticipant) => {
      if (!participant) return;
      
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        
        if (data.type === 'transcription') {
          const { text, fromLang } = data;
          
          // Translate if needed
          if (fromLang !== targetLanguage) {
            translateText(text, fromLang, targetLanguage).then((translated) => {
              setTranscriptions((prev) => ({
                ...prev,
                [participant.identity]: translated,
              }));
              
              // Clear after 5 seconds
              setTimeout(() => {
                setTranscriptions((prev) => {
                  const next = { ...prev };
                  if (next[participant.identity] === translated) {
                    delete next[participant.identity];
                  }
                  return next;
                });
              }, 5000);
            });
          } else {
            setTranscriptions((prev) => ({
              ...prev,
              [participant.identity]: text,
            }));
            
            setTimeout(() => {
              setTranscriptions((prev) => {
                const next = { ...prev };
                if (next[participant.identity] === text) {
                  delete next[participant.identity];
                }
                return next;
              });
            }, 5000);
          }
        }
      } catch (e) {
        console.error("Failed to parse data packet", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, targetLanguage, setTranscriptions]);

  // For the MVP, we'll add a "Simulate Speech" button or use a mock transcription loop
  // since real-time STT in the browser requires more complex setup (Deepgram/Whisper)
  // and I want to show the translation pipeline working.
  
  const broadcastTranscription = useCallback((text: string) => {
    if (localParticipant && room.state === 'connected') {
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify({
        type: 'transcription',
        text,
        fromLang: spokenLanguage
      }));
      try {
        localParticipant.publishData(payload, { reliable: true });
      } catch (e) {
        console.error("Failed to publish data", e);
      }
    } else {
      console.warn("Cannot broadcast: localParticipant missing or room not connected", {
        hasParticipant: !!localParticipant,
        roomState: room.state
      });
    }
  }, [localParticipant, room.state, spokenLanguage]);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-zinc-950">
      <div className="flex-1 relative">
        <div className="h-full">
          <GridLayout tracks={tracks}>
            <ParticipantTile />
          </GridLayout>
        </div>
        
        {/* Subtitle Overlays */}
        <div className="absolute inset-0 pointer-events-none z-50">
          {Object.entries(transcriptions).map(([identity, text]) => (
            <SubtitleOverlay key={identity} identity={identity} text={text} />
          ))}
        </div>
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ControlBar variation="minimal" controls={{ leave: false }} />
            <button 
              onClick={onLeave}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-all border border-red-500/20"
            >
              Leave Room
            </button>
          </div>
          
          {/* Simulation Controls (For Demo) */}
          <div className="flex gap-2">
            <button 
              onClick={() => broadcastTranscription("Hello, how are you today?")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium transition-all border border-white/5"
            >
              Simulate: "Hello..."
            </button>
            <button 
              onClick={() => broadcastTranscription("I am excited to show you this translator.")}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium transition-all border border-white/5"
            >
              Simulate: "I am excited..."
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
