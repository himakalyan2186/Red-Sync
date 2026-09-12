require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/db');
const { hospitalsRouter, campsRouter, donationsRouter, adminRouter, statsRouter } = require('./routes/combined');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET','POST'] },
  pingTimeout: 60000,
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 200 }));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/hospitals',      hospitalsRouter);
app.use('/api/blood-requests', require('./routes/bloodRequests'));
app.use('/api/blood-camps',    campsRouter);
app.use('/api/donations',      donationsRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/stats',          statsRouter);
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── IMPROVED Socket.IO Chat ─────────────────────────────────────────────────
// session: { messages[], createdAt, expiresAt, participants: Map(socketId → {userId,userName,role}) }
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    const expiresAt = Date.now() + 30*60*1000;
    sessions.set(sessionId, { messages: [], createdAt: Date.now(), expiresAt, participants: new Map() });
    setTimeout(() => {
      io.to(sessionId).emit('chat_expired', { message: 'Chat session expired (30-minute limit).' });
      sessions.delete(sessionId);
    }, 30*60*1000);
  }
  return sessions.get(sessionId);
}

io.on('connection', (socket) => {
  socket.on('join_chat', ({ sessionId, userId, userName, role }) => {
    if (!sessionId) return;
    socket.join(sessionId);
    const session = getOrCreateSession(sessionId);
    session.participants.set(socket.id, { userId, userName, role });
    const minutesLeft = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000));
    socket.emit('chat_joined', { messages: session.messages, minutesLeft, participantCount: session.participants.size });
    socket.to(sessionId).emit('user_joined', { userName, role, participantCount: session.participants.size });
  });

  socket.on('send_message', ({ sessionId, message, senderId, senderName, role }) => {
    if (!sessionId || !message?.trim()) return;
    const session = sessions.get(sessionId);
    if (!session) { socket.emit('chat_error', { message: 'Session not found or expired.' }); return; }
    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      senderId, senderName, role,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };
    session.messages.push(msg);
    io.to(sessionId).emit('receive_message', msg);
  });

  socket.on('typing', ({ sessionId, senderName, isTyping }) => {
    socket.to(sessionId).emit('typing_update', { senderName, isTyping });
  });

  socket.on('leave_chat', ({ sessionId, userName }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.participants.delete(socket.id);
      socket.to(sessionId).emit('user_left', { userName, participantCount: session.participants.size });
    }
    socket.leave(sessionId);
  });

  socket.on('disconnect', () => {
    sessions.forEach((session, sessionId) => {
      if (session.participants.has(socket.id)) {
        const { userName } = session.participants.get(socket.id);
        session.participants.delete(socket.id);
        io.to(sessionId).emit('user_left', { userName, participantCount: session.participants.size });
      }
    });
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;
(async () => {
  try {
    console.log('\n🩸  Life Anchor – Blood Donation Management System');
    console.log('─────────────────────────────────────────────────');
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀  Backend  → http://localhost:${PORT}`);
      console.log(`🌐  Frontend → ${process.env.CLIENT_URL||'http://localhost:5173'}\n`);
    });
  } catch (err) { console.error('❌ Startup failed:', err.message); process.exit(1); }
})();
