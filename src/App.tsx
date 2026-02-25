import React, { useState } from 'react';
import { Lobby } from './components/Lobby';
import { VideoRoom } from './components/VideoRoom';
import { useAppStore } from './store';

export default function App() {
  const [inRoom, setInRoom] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [envStatus, setEnvStatus] = useState<{ hasLiveKitUrl: boolean; hasGeminiKey: boolean } | null>(null);
  const { roomName, userName } = useAppStore();

  React.useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setEnvStatus(data.env))
      .catch(err => console.error("Health check failed", err));
  }, []);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/token?room=${roomName}&username=${userName}`);
      const data = await resp.json();
      if (data.token) {
        setToken(data.token);
        setInRoom(true);
      } else {
        alert("Failed to get token: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 animate-pulse">Connecting to meeting...</p>
      </div>
    );
  }

  if (inRoom && token) {
    return <VideoRoom token={token} onLeave={() => setInRoom(false)} />;
  }

  return (
    <>
      <Lobby onJoin={handleJoin} />
      {envStatus && (!envStatus.hasLiveKitUrl || !envStatus.hasGeminiKey) && (
        <div className="fixed bottom-4 right-4 max-w-xs bg-red-500/90 text-white p-4 rounded-xl shadow-2xl backdrop-blur-sm text-sm z-[100]">
          <p className="font-bold mb-1">Missing Configuration</p>
          <p className="opacity-90">
            {!envStatus.hasLiveKitUrl && "• LIVEKIT_URL is missing\n"}
            {!envStatus.hasGeminiKey && "• GEMINI_API_KEY is missing"}
          </p>
          <p className="mt-2 text-xs opacity-75">Please set these in AI Studio Secrets.</p>
        </div>
      )}
    </>
  );
}
