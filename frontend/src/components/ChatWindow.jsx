import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;
function getSocket() {
  if (!socketInstance) {
    socketInstance = io('/', { transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socketInstance;
}

export default function ChatWindow({ sessionId, currentUser, otherParty, requestInfo, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [minutesLeft, setMinutesLeft] = useState(30);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUser, setTypingUser] = useState(null);
  const [expired, setExpired] = useState(false);
  const [connected, setConnected] = useState(false);
  const [systemMsgs, setSystemMsgs] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const countdownRef = useRef(null);

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollBottom(); }, [messages, typingUser]);

  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();

    socket.emit('join_chat', {
      sessionId,
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
    });

    socket.on('chat_joined', ({ messages: hist, minutesLeft: ml, participantCount }) => {
      setMessages(hist);
      setMinutesLeft(ml);
      setOnlineCount(participantCount);
      setConnected(true);
      // Start countdown
      clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setMinutesLeft(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 60000);
    });

    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user_joined', ({ userName, participantCount }) => {
      setOnlineCount(participantCount);
      setSystemMsgs(prev => [...prev, `${userName} joined the chat`]);
    });

    socket.on('user_left', ({ userName, participantCount }) => {
      setOnlineCount(participantCount);
      setSystemMsgs(prev => [...prev, `${userName} left the chat`]);
    });

    socket.on('typing_update', ({ senderName, isTyping }) => {
      setTypingUser(isTyping ? senderName : null);
    });

    socket.on('chat_expired', () => {
      setExpired(true);
      clearInterval(countdownRef.current);
    });

    socket.on('chat_error', ({ message }) => {
      setSystemMsgs(prev => [...prev, `⚠️ ${message}`]);
    });

    return () => {
      socket.emit('leave_chat', { sessionId, userName: currentUser.name });
      socket.off('chat_joined');
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('typing_update');
      socket.off('chat_expired');
      socket.off('chat_error');
      clearInterval(countdownRef.current);
    };
  }, [sessionId]);

  const sendMessage = () => {
    const txt = input.trim();
    if (!txt || expired) return;
    const socket = getSocket();
    socket.emit('send_message', {
      sessionId,
      message: txt,
      senderId: currentUser.id,
      senderName: currentUser.name,
      role: currentUser.role,
    });
    // Stop typing
    socket.emit('typing', { sessionId, senderName: currentUser.name, isTyping: false });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    const socket = getSocket();
    socket.emit('typing', { sessionId, senderName: currentUser.name, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { sessionId, senderName: currentUser.name, isTyping: false });
    }, 1500);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const whatsappUrl = otherParty?.phone
    ? `https://wa.me/${otherParty.phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(otherParty.name)}%2C%20I%20am%20contacting%20you%20regarding%20the%20blood%20donation%20request%20on%20Life%20Anchor.`
    : null;

  return (
    <div className="chat-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chat-box" style={{ position: 'relative' }}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h3>💬 Secure Chat — {requestInfo?.patient_name || 'Blood Request'}</h3>
            <div className="chat-meta">
              <span className="chat-timer">⏱ {minutesLeft} min left</span>
              <span className="chat-online">
                <span className="online-dot"></span>
                {onlineCount} online
              </span>
              {connected && <span style={{ opacity: 0.7 }}>🔒 Encrypted</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Other party contact card at top */}
        {otherParty && (
          <div style={{ padding: '12px 16px', background: '#fff8f5', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {otherParty.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{otherParty.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                {otherParty.role === 'donor' ? '💉 Donor' : '🙏 Seeker'} · {otherParty.blood_group || ''}
                {otherParty.badge && ` · ${otherParty.badge}`}
              </div>
            </div>
            {otherParty.phone && (
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={`tel:${otherParty.phone}`} className="btn btn-outline btn-sm">📞 Call</a>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-sm">WhatsApp</a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {/* System messages */}
          {systemMsgs.map((m, i) => (
            <div key={`sys-${i}`} className="chat-system">{m}</div>
          ))}

          {messages.length === 0 && !expired && (
            <div className="chat-system" style={{ marginTop: 20 }}>
              Chat started. Messages auto-delete after 30 minutes. 🔒
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`chat-msg ${isMine ? 'mine' : 'theirs'}`}>
                {!isMine && <div className="chat-msg-sender">{msg.senderName}</div>}
                {msg.message}
                <div className="chat-msg-time">{formatTime(msg.timestamp)}</div>
              </div>
            );
          })}

          {typingUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{typingUser} is typing…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Expired overlay */}
        {expired && (
          <div className="chat-expired-overlay">
            <div style={{ fontSize: '2.5rem' }}>⏰</div>
            <h3 style={{ color: 'var(--red)' }}>Chat Session Expired</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>This 30-minute session has ended. All messages have been deleted for privacy.</p>
            {otherParty?.phone && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={`tel:${otherParty.phone}`} className="btn btn-outline">📞 Call {otherParty.name}</a>
                {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-whatsapp">WhatsApp</a>}
              </div>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        )}

        {/* Input */}
        {!expired && (
          <div className="chat-footer">
            <input
              className="form-control chat-input"
              placeholder="Type a message… (Enter to send)"
              value={input}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={500}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}
