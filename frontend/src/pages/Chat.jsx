import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast, confirm } from '../components/Toast';
import '../styles/pages/Chat.css';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const pollRef = useRef(null);
  const prevMsgCount = useRef(0);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Scroll to bottom only when message count increases AND user hasn't scrolled up
  useEffect(() => {
    const newCount = messages.length;
    if (newCount > prevMsgCount.current && !userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: prevMsgCount.current === 0 ? 'auto' : 'smooth' });
    }
    prevMsgCount.current = newCount;
  }, [messages]);

  // Track if user has scrolled up in the messages area
  const handleMessagesScroll = () => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    userScrolledUp.current = !atBottom;
  };

  const fetchMessages = async () => {
    try {
      const res = await messageAPI.getMyMessages();
      setMessages(res.data.messages || []);
      setConversationId(res.data.conversation_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await messageAPI.sendMessage(text.trim());
      setText('');
      await fetchMessages();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    const yes = await confirm('Clear conversation?', 'This will hide it from your view. Admins will still have their copy.');
    if (!yes) return;
    setDeleting(true);
    try {
      await messageAPI.deleteConversation();
      setMessages([]);
      setConversationId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to clear conversation.');
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateLabel(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const grouped = [];
  let lastLabel = null;
  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at);
    if (label !== lastLabel) {
      grouped.push({ type: 'date', label });
      lastLabel = label;
    }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <section className="chat-hero">
          <div className="chat-hero-copy">
            <div className="chat-hero-kicker">Support Center</div>
            <h1>Talk to the BlockLend team</h1>
            <p>
              Ask about borrowing, account issues, verification, or anything else you need help with.
              We’ll keep the conversation in one place.
            </p>
          </div>

          <div className="chat-hero-meta">
            <div className="chat-meta-chip">
              <span className="chat-meta-dot" />
              Usually replies within a day
            </div>
            <div className="chat-meta-chip chat-meta-chip--soft">
              Secure and private support thread
            </div>
          </div>
        </section>

        <div className="chat-wrapper">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-avatar">BL</div>
            <div className="chat-header-info">
              <div className="chat-header-name">BlockLend Support</div>
              <div className="chat-header-status">Admin team · usually replies within a day</div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                className="chat-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                {deleting ? '…' : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={messagesAreaRef} onScroll={handleMessagesScroll}>
            {loading ? (
              <div className="chat-loading"><div className="spinner"></div></div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">💬</div>
                <p>Send a message to start the conversation.</p>
                <p className="chat-empty-sub">Our admins typically respond within a business day.</p>
              </div>
            ) : (
              grouped.map((item, i) =>
                item.type === 'date' ? (
                  <div key={`date-${i}`} className="chat-date-label">{item.label}</div>
                ) : (
                  <div
                    key={item.msg.id}
                    className={`chat-bubble-row ${item.msg.sender_role === 'user' ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'}`}
                  >
                    {item.msg.sender_role === 'admin' && (
                      <div className="chat-avatar chat-avatar--admin">A</div>
                    )}
                    <div className="chat-bubble-col">
                      {item.msg.sender_role === 'admin' && (
                        <div className="chat-sender-name">Admin</div>
                      )}
                      <div className={`chat-bubble ${item.msg.sender_role === 'user' ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                        {item.msg.text}
                      </div>
                      <div className="chat-time">{formatTime(item.msg.created_at)}</div>
                    </div>
                    {item.msg.sender_role === 'user' && (
                      <div className="chat-avatar chat-avatar--user">
                        {(user?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form className="chat-input-row" onSubmit={handleSend}>
            <textarea
              className="chat-input"
              rows={1}
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button type="submit" className="chat-send-btn" disabled={sending || !text.trim()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
