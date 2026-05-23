'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface UseWebRTCOptions {
  roomId: string;
}

interface ChatMessage {
  senderId: string;
  message: string;
  timestamp: string;
}

export function useWebRTC({ roomId }: UseWebRTCOptions) {
  const router = useRouter();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({});
  const [peerStates, setPeerStates] = useState<{ [socketId: string]: RTCPeerConnectionState }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const candidateQueueMap = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({});

  const stunServer = process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302';

  // Cleanup helper for a single peer connection
  const cleanupPeer = useCallback((peerId: string) => {
    console.log(`Cleaning up peer connection for ${peerId}`);
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    if (candidateQueueMap.current[peerId]) {
      delete candidateQueueMap.current[peerId];
    }
    setRemoteStreams(prev => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
    setPeerStates(prev => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }, []);

  // Hangup function
  const hangUp = useCallback(() => {
    console.log('Hanging up call...');
    // Close all connections
    Object.keys(peerConnections.current).forEach(peerId => {
      cleanupPeer(peerId);
    });

    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Redirect to home page
    router.push('/');
  }, [router, cleanupPeer]);

  // Create RTCPeerConnection helper
  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    console.log(`Creating RTCPeerConnection for peer ${peerId}. Initiator: ${isInitiator}`);
    
    if (peerConnections.current[peerId]) {
      console.warn(`Peer connection already exists for ${peerId}, cleaning it up first`);
      cleanupPeer(peerId);
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: stunServer }
      ]
    });

    peerConnections.current[peerId] = pc;

    // Add local tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Track state changes to update overall room status
    pc.onconnectionstatechange = () => {
      console.log(`Connection state change for ${peerId}: ${pc.connectionState}`);
      setPeerStates(prev => ({ ...prev, [peerId]: pc.connectionState }));
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(peerId);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log(`Sending ICE candidate to ${peerId}`);
        socketRef.current.emit('ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received track from ${peerId}: ${event.track.kind}`);
      setRemoteStreams(prev => {
        const existingStream = prev[peerId];
        if (existingStream) {
          if (!existingStream.getTracks().includes(event.track)) {
            existingStream.addTrack(event.track);
          }
          return { ...prev, [peerId]: existingStream };
        } else {
          // Fallback to event streams if available, or create new one
          const newStream = event.streams[0] || new MediaStream();
          if (!event.streams[0]) {
            newStream.addTrack(event.track);
          }
          return { ...prev, [peerId]: newStream };
        }
      });
    };

    return pc;
  }, [stunServer, cleanupPeer]);

  // Toggle Mute (Microphone)
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log(`Audio track enabled: ${audioTrack.enabled}`);
      }
    }
  }, []);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        console.log(`Video track enabled: ${videoTrack.enabled}`);
      }
    }
  }, []);

  // Send Message
  const sendMessage = useCallback((msg: string) => {
    if (socketRef.current && msg.trim() !== '') {
      console.log(`Sending message: ${msg}`);
      socketRef.current.emit('chat-message', {
        roomId,
        message: msg
      });
    }
  }, [roomId]);

  useEffect(() => {
    let active = true;

    async function startCall() {
      try {
        console.log('Requesting local media stream...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Connect to Socket.IO signaling server
        console.log('Connecting to signaling server...');
        const socket = io({
          path: '/socket.io', // Ensure socket.io matches standard custom server configuration
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('Connected to signaling server with ID:', socket.id);
          socket.emit('join-room', roomId);
        });

        socket.on('room-users', async (existingUserIds: string[]) => {
          console.log('Existing users in room:', existingUserIds);
          // For each existing user, create a Peer Connection as the initiator
          for (const peerId of existingUserIds) {
            const pc = createPeerConnection(peerId, true);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log(`Sending offer to ${peerId}`);
              socket.emit('offer', { targetId: peerId, offer });
            } catch (err) {
              console.error(`Failed to create offer for peer ${peerId}:`, err);
            }
          }
        });

        socket.on('peer-joined', (newPeerId: string) => {
          console.log(`New peer joined the room: ${newPeerId}`);
          // New peer will be the initiator and send us an offer, so we do not initiate here.
          // We can initialize state trackers for them if needed
        });

        socket.on('offer', async ({ senderId, offer }) => {
          console.log(`Received offer from ${senderId}`);
          const pc = createPeerConnection(senderId, false);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`Sending answer to ${senderId}`);
            socket.emit('answer', { targetId: senderId, answer });

            // Process any queued candidates for this peer
            const queue = candidateQueueMap.current[senderId] || [];
            console.log(`Processing ${queue.length} queued candidates for ${senderId}`);
            for (const cand of queue) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            delete candidateQueueMap.current[senderId];
          } catch (err) {
            console.error(`Failed to handle offer from ${senderId}:`, err);
          }
        });

        socket.on('answer', async ({ senderId, answer }) => {
          console.log(`Received answer from ${senderId}`);
          const pc = peerConnections.current[senderId];
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              
              // Process any queued candidates for this peer
              const queue = candidateQueueMap.current[senderId] || [];
              console.log(`Processing ${queue.length} queued candidates for ${senderId}`);
              for (const cand of queue) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              delete candidateQueueMap.current[senderId];
            } catch (err) {
              console.error(`Failed to set remote description for ${senderId}:`, err);
            }
          } else {
            console.error(`Peer connection not found for ${senderId} to apply answer`);
          }
        });

        socket.on('ice-candidate', async ({ senderId, candidate }) => {
          console.log(`Received ICE candidate from ${senderId}`);
          const pc = peerConnections.current[senderId];
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error(`Failed to add ICE candidate for ${senderId}:`, err);
            }
          } else {
            // Queue candidate until remote description is set
            console.log(`Remote description not set yet for ${senderId}. Queueing ICE candidate`);
            if (!candidateQueueMap.current[senderId]) {
              candidateQueueMap.current[senderId] = [];
            }
            candidateQueueMap.current[senderId].push(candidate);
          }
        });

        socket.on('peer-disconnected', (peerId: string) => {
          console.log(`Peer disconnected event for ${peerId}`);
          cleanupPeer(peerId);
        });

        socket.on('chat-message', (data: ChatMessage) => {
          console.log(`Received chat message:`, data);
          setMessages(prev => [...prev, data]);
        });

        socket.on('disconnect', () => {
          console.warn('Disconnected from signaling server');
        });

      } catch (err) {
        console.error('Error getting media devices or connecting:', err);
      }
    }

    startCall();

    return () => {
      active = false;
      // Note: We don't automatically call hangUp here to keep standard behavior,
      // but let's clean up WebRTC resources when component unmounts for safety.
      console.log('Unmounting useWebRTC hook, cleaning up connections...');
      Object.keys(peerConnections.current).forEach(peerId => {
        if (peerConnections.current[peerId]) {
          peerConnections.current[peerId].close();
        }
      });
      peerConnections.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, createPeerConnection, cleanupPeer]);

  // Compute overall connection status
  let connectionStatus: 'waiting' | 'connecting' | 'connected' = 'waiting';
  const activePeerIds = Object.keys(remoteStreams);

  if (activePeerIds.length === 0) {
    connectionStatus = 'waiting';
  } else {
    // Check if at least one peer connection is fully established
    const statuses = Object.keys(peerConnections.current).map(
      peerId => peerStates[peerId] || peerConnections.current[peerId]?.connectionState
    );
    if (statuses.includes('connected')) {
      connectionStatus = 'connected';
    } else {
      connectionStatus = 'connecting';
    }
  }

  return {
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
  };
}
