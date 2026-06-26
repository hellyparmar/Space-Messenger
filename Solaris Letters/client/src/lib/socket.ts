import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const isProd = !SOCKET_URL.includes('localhost') && !SOCKET_URL.includes('127.0.0.1');

let socket: Socket | null = null;

async function wakeServer() {
  // Only ping the Render production URL in production — in dev it causes CORS noise
  if (isProd) {
    try {
      await fetch('https://solaris-letters-server.onrender.com/ping');
    } catch { /* server still starting, socket reconnection will handle it */ }
  }
  try {
    const pingUrl = SOCKET_URL.replace(/^ws/, 'http') + '/ping';
    await fetch(pingUrl);
  } catch { /* server still starting, socket reconnection will handle it */ }
}

// Initial wake on file load
wakeServer();

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect_error', (err) => {
      console.warn('Connection failed, retrying...', err.message);
      // Do NOT show an error to the user during retry attempts
    });
  }
  return socket;
}

export function connectSocket(token: string) {
  wakeServer();
  const s = getSocket();
  s.auth = { token };
  s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
