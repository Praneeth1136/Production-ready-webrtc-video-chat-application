import { io as clientIo, Socket } from 'socket.io-client';

describe('Signaling Server Tests', () => {
  let socket1: Socket;
  let socket2: Socket;
  const testRoomId = 'test-verification-room';
  const serverUrl = 'http://localhost:3000';

  afterEach(() => {
    if (socket1 && socket1.connected) socket1.disconnect();
    if (socket2 && socket2.connected) socket2.disconnect();
  });

  it('should successfully connect to signaling server and join room', (done) => {
    socket1 = clientIo(serverUrl, { autoConnect: false, path: '/socket.io' });
    
    socket1.on('connect', () => {
      expect(socket1.connected).toBe(true);
      socket1.emit('join-room', testRoomId);
      done();
    });

    socket1.connect();
  });

  it('should exchange signaling offers and chat messages between two peers', (done) => {
    let receivedOffer = false;
    let receivedChat = false;

    const checkDone = () => {
      if (receivedOffer && receivedChat) {
        done();
      }
    };

    socket1 = clientIo(serverUrl, { path: '/socket.io' });
    
    socket1.on('connect', () => {
      socket1.emit('join-room', testRoomId);

      socket1.on('room-users', () => {
        // Socket 2 joins after Socket 1 is connected and in the room
        socket2 = clientIo(serverUrl, { path: '/socket.io' });
        
        socket2.on('connect', () => {
          socket2.emit('join-room', testRoomId);
        });

        socket2.on('room-users', (existingUsers: string[]) => {
          // Socket 2 sees Socket 1 in the room and sends an offer
          expect(existingUsers).toContain(socket1.id);
          socket2.emit('offer', {
            targetId: socket1.id,
            offer: { type: 'offer', sdp: 'dummy-sdp-data' }
          });

          // Send a chat message
          socket2.emit('chat-message', {
            roomId: testRoomId,
            message: 'Hello and welcome!'
          });
        });
      });
    });

    socket1.on('offer', ({ senderId, offer }) => {
      expect(senderId).toBe(socket2.id);
      expect(offer.sdp).toBe('dummy-sdp-data');
      receivedOffer = true;
      checkDone();
    });

    socket1.on('chat-message', ({ senderId, message }) => {
      expect(senderId).toBe(socket2.id);
      expect(message).toBe('Hello and welcome!');
      receivedChat = true;
      checkDone();
    });
  });
});
