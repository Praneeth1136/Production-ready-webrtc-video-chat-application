import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const generateUUID = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleCreateRoom = () => {
    const newRoomId = generateUUID();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim() !== '') {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans overflow-x-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            P
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Partnr
          </span>
        </div>
      </header>

      {/* Main Hero Card Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 z-10 py-12">
        <div className="flex-1 text-center lg:text-left space-y-6 max-w-2xl">
          <span className="px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wider uppercase">
            ⚡ Ultra Low Latency MERN WebRTC Video
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
            Seamless multi-peer <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              video collaborations
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
            A state-of-the-art WebRTC video conferencing space. Establish instant P2P mesh audio & video calls with integrated real-time text chatting. Completely free, secure, and running inside your browser.
          </p>
        </div>

        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-2xl relative">
          <div className="absolute top-0 right-10 transform -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-[10px] px-3.5 py-1 rounded-full shadow-lg shadow-indigo-500/20 uppercase tracking-widest">
            Ready to deploy
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">Create or Join a Space</h3>
          <p className="text-slate-400 text-xs mb-8">Generate a unique space identifier or enter an existing code to join your team.</p>

          <div className="space-y-6">
            <button
              onClick={handleCreateRoom}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 group hover:scale-[1.01]"
            >
              Start a New Call
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold tracking-widest uppercase">Or join existing</span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                placeholder="Enter Room ID / UUID..."
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors"
              />
              <button
                type="submit"
                disabled={roomId.trim() === ''}
                className="w-full py-4 px-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700/80 text-slate-200 font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none hover:text-white"
              >
                Join Space
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 z-10 mt-auto">
        <div className="max-w-7xl w-full mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
              Partnr Logo
            </span>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-xs text-slate-500">© 2025-26 Partnr. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500">
            <a href="#" className="hover:text-indigo-400 transition-colors">About Us</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Contact Us</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Terms and Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
