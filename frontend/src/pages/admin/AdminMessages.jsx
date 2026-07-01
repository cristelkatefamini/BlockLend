import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../utils/api';
import '../../styles/pages/Admin.css';
import '../../styles/pages/Chat.css';

export default function AdminMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [activeUsername, setActiveUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => clearInterval(pollRef.current);
  }, [user, navigate]);

  useEffect(() => {
    if (activeUserId) {
      fetchThread(activeUserId);
    }
  }, [activeUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (userId) => {
    try {
      const res = await messageAPI.getConversation(userId);
      setMessages(res.data.messages || []);
      setActiveUsername(res.data.username || userId);
      // Refresh conversation list to clear unread badge
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  // Poll active thread every 3s
  useEffect(() => {
    if (!activeUserId) return;
    const t = setInterval(() => fetchThread(activeUserId), 3000);
    return () => clearInterval(t);
  }, [activeUserId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !activeUserId) return;
    setSending(true);
    try {
      await messageAPI.sendAdminReply(activeUserId, text.trim());
      setText('');
      await fetchThread(activeUserId);
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
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

  function formatRelative(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
    <div className="admin-container" style={{ padding: '1.5rem 0 0' }}>
      <div className="container" style={{ maxWidth: 1180, padding: '0 2.5rem' }}>
        <div className="admin-header" style={{ marginBottom: '1rem' }}>
          <h1>Messages</h1>
          <p>All user conversations — visible to all admins</p>
        </div>

        <div className="admin-chat-layout">
          {/* Sidebar */}
          <aside className="admin-chat-sidebar">
            <div className="admin-chat-sidebar-title">Conversations</div>
            {loading ? (
              <div className="admin-chat-sidebar-empty">
                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }}></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="admin-chat-sidebar-empty">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`admin-chat-conv-item ${activeUserId === conv.user_id ? 'admin-chat-conv-item--active' : ''}`}
                  onClick={() => setActiveUserId(conv.user_id)}
                >
                  <div className="admin-chat-conv-avatar">
                    {conv.profile_image
                      ? <img src={conv.profile_image} alt={conv.username} />
                      : (conv.username || 'U').charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="admin-chat-conv-info">
                    <div className="admin-chat-conv-name">
                      {conv.username}
                      {conv.unread_by_admin > 0 && (
                        <span className="admin-chat-unread-badge">{conv.unread_by_admin}</span>
                      )}
                    </div>
                    <div className="admin-chat-conv-last">
                      {conv.last_message || 'No messages yet'}
                    </div>
                  </div>
                  <div className="admin-chat-conv-time">
                    {formatRelative(conv.updated_at)}
                  </div>
                </button>
              ))
            )}
          </aside>

          {/* Thread */}
          <div className="admin-chat-thread">
            {!activeUserId ? (
              <div className="admin-chat-thread-empty">
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💬</div>
                <p>Select a conversation to view messages</p>
              </div>
            ) : (
              <>
                <div className="admin-chat-thread-header">
                  <div className="chat-avatar chat-avatar--user" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                    {activeUsername.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--landing-navy)' }}>{activeUsername}</div>
                    <div style={{ fontSize: '0.78rem', color: '#888' }}>User</div>
                  </div>
                </div>

                <div className="chat-messages admin-chat-messages">
                  {grouped.map((item, i) =>
                    item.type === 'date' ? (
                      <div key={`date-${i}`} className="chat-date-label">{item.label}</div>
                    ) : (
                      <div
                        key={item.msg.id}
                        className={`chat-bubble-row ${item.msg.sender_role === 'admin' ? 'chat-bubble-row--mine' : 'chat-bubble-row--theirs'}`}
                      >
                        {item.msg.sender_role === 'user' && (
                          <div className="chat-avatar chat-avatar--user">
                            {activeUsername.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="chat-bubble-col">
                          {item.msg.sender_role === 'admin' && (
                            <div className="chat-sender-name" style={{ textAlign: 'right' }}>
                              {item.msg.sender_name} (Admin)
                            </div>
                          )}
                          <div className={`chat-bubble ${item.msg.sender_role === 'admin' ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                            {item.msg.text}
                          </div>
                          <div className="chat-time">{formatTime(item.msg.created_at)}</div>
                        </div>
                        {item.msg.sender_role === 'admin' && (
                          <div className="chat-avatar chat-avatar--admin">A</div>
                        )}
                      </div>
                    )
                  )}
                  <div ref={bottomRef} />
                </div>

                <form className="chat-input-row" onSubmit={handleSend}>
                  <textarea
                    className="chat-input"
                    rows={1}
                    placeholder={`Reply to ${activeUsername}…`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <button type="submit" className="chat-send-btn" disabled={sending || !text.trim()}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
