'use client';

import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import Link from 'next/link';

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

function RemoteVideo({ id, stream }: { id: string; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border border-slate-700 shadow-xl group transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-slate-200 font-semibold border border-slate-700/50">
        Participant {id.substring(0, 4)}
      </div>
    </div>
  );
}

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const {
    localStream,
    remoteStreams,
    connectionStatus,
    isMuted,
    isCameraOff,
    messages,
    toggleMute,
    toggleCamera,
    hangUp,
    sendMessage
  } = useWebRTC({ roomId });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');

  // Assign local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() !== '') {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const remoteStreamsList = Object.entries(remoteStreams);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header bar */}
      <header className="px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Partnr Space
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            Room: {roomId.substring(0, 8)}...
          </span>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center">
          {connectionStatus === 'waiting' && (
            <div
              data-test-id="status-waiting"
              className="px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
              Waiting for others...
            </div>
          )}
          {connectionStatus === 'connecting' && (
            <div
              data-test-id="status-connecting"
              className="px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Connecting peers...
            </div>
          )}
          {connectionStatus === 'connected' && (
            <div
              data-test-id="status-connected"
              className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </div>
          )}
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Call Display Area */}
        <div className="flex-1 p-6 flex flex-col justify-center items-center gap-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
          {remoteStreamsList.length === 0 ? (
            <div className="text-center py-20 px-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 max-w-md w-full backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6 text-indigo-400 text-2xl font-bold">
                P
              </div>
              <h2 className="text-xl font-semibold mb-2">You are alone in the space</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Share this room ID or copy the URL and invite friends to start a multi-peer WebRTC video session.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Invite link copied to clipboard!');
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide transition-all duration-200 shadow-lg shadow-indigo-600/20"
              >
                Copy Invite URL
              </button>
            </div>
          ) : (
            <div
              data-test-id="remote-video-container"
              className={`w-full grid gap-6 ${
                remoteStreamsList.length === 1
                  ? 'grid-cols-1 max-w-3xl'
                  : remoteStreamsList.length === 2
                  ? 'grid-cols-2 max-w-5xl'
                  : 'grid-cols-2 md:grid-cols-3 max-w-6xl'
              } mx-auto`}
            >
              {remoteStreamsList.map(([peerId, stream]) => (
                <RemoteVideo key={peerId} id={peerId} stream={stream} />
              ))}
            </div>
          )}

          {/* Local User View (Floating PIP style when remote stream is active, centered if alone) */}
          <div
            className={`transition-all duration-500 z-30 ${
              remoteStreamsList.length === 0
                ? 'w-full max-w-md aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900 relative'
                : 'fixed bottom-24 right-6 w-48 sm:w-64 aspect-video rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900/90 backdrop-blur-sm'
            }`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              data-test-id="local-video"
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-300 font-bold border border-slate-700/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              You (Local)
            </div>
            {isCameraOff && (
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-500 font-medium text-xs sm:text-sm">
                Camera is off
              </div>
            )}
            {isMuted && (
              <div className="absolute top-3 right-3 bg-red-500/80 backdrop-blur-md p-1.5 rounded-lg text-white border border-red-500/20">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Chat Sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col h-[400px] lg:h-auto">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase">
              Live Room Chat
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
              {messages.length} messages
            </span>
          </div>

          {/* Chat Messages Container */}
          <div
            data-test-id="chat-log"
            className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                <svg className="w-8 h-8 opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOwnMessage = msg.senderId.substring(0, 4) === 'Local'; // Fallback check or set on hook
                return (
                  <div
                    key={idx}
                    data-test-id="chat-message"
                    className={`flex flex-col max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.senderId === 'system'
                        ? 'bg-slate-800/40 border border-slate-800/60 text-slate-400 text-xs text-center mx-auto max-w-[95%] py-1'
                        : 'bg-slate-800/60 text-slate-200 self-start border border-slate-800'
                    }`}
                  >
                    {msg.senderId !== 'system' && (
                      <span className="text-[10px] font-bold text-indigo-400 mb-0.5">
                        Peer {msg.senderId.substring(0, 4)}
                      </span>
                    )}
                    <p className="leading-relaxed break-words">{msg.message}</p>
                    <span className="text-[9px] text-slate-500 self-end mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form
            onSubmit={handleSendChat}
            className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center gap-2"
          >
            <input
              data-test-id="chat-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to space..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
            <button
              data-test-id="chat-submit"
              type="submit"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/10 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </aside>
      </div>

      {/* Control Actions Bar */}
      <footer className="px-6 py-5 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 flex justify-center items-center gap-4 z-40 sticky bottom-0">
        {/* Toggle Audio Mute */}
        <button
          data-test-id="mute-mic-button"
          onClick={toggleMute}
          className={`p-3.5 rounded-2xl border transition-all duration-200 shadow-md ${
            isMuted
              ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Toggle Video Camera */}
        <button
          data-test-id="toggle-camera-button"
          onClick={toggleCamera}
          className={`p-3.5 rounded-2xl border transition-all duration-200 shadow-md ${
            isCameraOff
              ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* Hangup / End Call */}
        <button
          data-test-id="hangup-button"
          onClick={hangUp}
          className="p-3.5 rounded-2xl bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95 text-white border border-red-700 transition-all duration-200 shadow-lg shadow-red-600/20"
          title="Leave / End Call"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="transform rotate-[135deg]">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
