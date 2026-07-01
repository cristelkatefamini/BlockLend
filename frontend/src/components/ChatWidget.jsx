import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatWidget } from '../context/ChatContext';
import { messageAPI } from '../utils/api';
import '../styles/ChatWidget.css';

export default function ChatWidget() {
  const { user, isAuthenticated } = useAuth();
  const { setTotalUnread } = useChatWidget();

  // Dropdown open state lives here — no longer in context
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [openWindows, setOpenWindows] = useState([]);
  const [msgsByUser, setMsgsByUser] = useState({});
  const [inputByUser, setInputByUser] = useState({});
  const [sendingByUser, setSendingByUser] = useState({});
  const [totalUnreadLocal, setTotalUnreadLocal] = useState(0);

  const triggerRef = useRef(null);   // the whole wrapper (button + dropdown)
  const windowRefs = useRef({});

  // ── Fetch conversation list ─────────────────────────────────────────────
  const fetchConversationList = async () => {
    try {
      let unread = 0;
      if (user?.role === 'admin') {
        const res = await messageAPI.getConversations();
        const convs = res.data.conversations || [];
        setConversations(convs);
        unread = convs.reduce((s, c) => s + (c.unread_by_admin || 0), 0);
      } else {
        const res = await messageAPI.getMyMessages();
        const msgs = res.data.messages || [];
        unread = res.data.unread_by_user || 0;
        // Only show the conversation in the dropdown if there are actual messages
        if (msgs.length > 0) {
          setConversations([{
            user_id: 'admin',
            username: 'Admin',
            profile_image: null,
            last_message: msgs.slice(-1)[0]?.text || '',
            unread_by_user: unread,
          }]);
        } else {
          setConversations([]);
        }
      }
      setTotalUnreadLocal(unread);
      setTotalUnread(unread);
    } catch (err) {
      console.error('[ChatWidget] fetchConversationList:', err);
    }
  };

  // ── Fetch messages for one window ──────────────────────────────────────
  const fetchMessages = async (userId, scroll = true) => {
    try {
      let messages = [];
      if (user?.role === 'admin') {
        const res = await messageAPI.getConversation(userId);
        messages = res.data.messages || [];
      } else {
        const res = await messageAPI.getMyMessages();
        messages = res.data.messages || [];
      }
      setMsgsByUser(prev => ({ ...prev, [userId]: messages }));
      if (scroll) {
        setTimeout(() => {
          const el = windowRefs.current[userId];
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      }
    } catch (err) {
      console.error('[ChatWidget] fetchMessages:', err);
    }
  };

  // ── Polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchConversationList();
    const id = setInterval(fetchConversationList, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (openWindows.length === 0) return;
    const id = setInterval(() => {
      openWindows.forEach(w => fetchMessages(w.userId, false));
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWindows]);

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Window management ──────────────────────────────────────────────────
  const openWindow = (conv) => {
    const userId = conv.user_id;
    setDropdownOpen(false);
    if (openWindows.find(w => w.userId === userId)) {
      setTimeout(() => {
        const el = windowRefs.current[userId];
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
      return;
    }
    setOpenWindows(prev => [...prev, {
      userId,
      username: conv.username,
      profileImage: conv.profile_image,
    }]);
    fetchMessages(userId, true);
  };

  const closeWindow = (userId) => {
    setOpenWindows(prev => prev.filter(w => w.userId !== userId));
    setMsgsByUser(prev => { const n = { ...prev }; delete n[userId]; return n; });
    setInputByUser(prev => { const n = { ...prev }; delete n[userId]; return n; });
  };

  const handleDeleteConversation = async (userId) => {
    if (!window.confirm('Delete this entire conversation? This cannot be undone.')) return;
    try {
      await messageAPI.adminDeleteConversation(userId);
      closeWindow(userId);
      await fetchConversationList();
    } catch (err) {
      console.error('[ChatWidget] deleteConversation:', err);
      alert('Failed to delete conversation.');
    }
  };

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = async (userId) => {
    const text = (inputByUser[userId] || '').trim();
    if (!text) return;
    setSendingByUser(prev => ({ ...prev, [userId]: true }));
    try {
      if (user?.role === 'admin') {
        await messageAPI.sendAdminReply(userId, text);
      } else {
        await messageAPI.sendMessage(text);
      }
      setInputByUser(prev => ({ ...prev, [userId]: '' }));
      await fetchMessages(userId, true);
      await fetchConversationList();
    } catch (err) {
      console.error('[ChatWidget] handleSend:', err);
    } finally {
      setSendingByUser(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleKeyDown = (e, userId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(userId);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* ── Trigger button + dropdown — inline in nav via CSS ── */}
      <div className="cw-trigger-wrapper" ref={triggerRef}>
        <button
          type="button"
          className="cw-trigger-btn"
          onClick={() => setDropdownOpen(o => !o)}
          aria-label="Messages"
          aria-expanded={dropdownOpen}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {totalUnreadLocal > 0 && (
            <span className="cw-unread-badge">
              {totalUnreadLocal > 9 ? '9+' : totalUnreadLocal}
            </span>
          )}
        </button>

        {/* Dropdown — positioned relative to the button */}
        {dropdownOpen && (
          <div className="cw-dropdown">
            <div className="cw-dropdown-header">Messages</div>
            <div className="cw-dropdown-list">
              {conversations.length === 0 ? (
                <div className="cw-dropdown-empty">No conversations yet</div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.user_id}
                    type="button"
                    className="cw-conv-item"
                    onClick={() => openWindow(conv)}
                  >
                    <div className="cw-conv-avatar">
                      {conv.profile_image
                        ? <img src={conv.profile_image} alt={conv.username} />
                        : (conv.username || 'U').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="cw-conv-info">
                      <div className="cw-conv-name">
                        {conv.username}
                        {(conv.unread_by_admin > 0 || conv.unread_by_user > 0) && (
                          <span className="cw-unread-dot" />
                        )}
                      </div>
                      <div className="cw-conv-last">
                        {conv.last_message || 'Start a conversation'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Floating chat windows ── */}
      {openWindows.map((win, idx) => {
        const messages = msgsByUser[win.userId] || [];
        const inputText = inputByUser[win.userId] || '';
        const sending = sendingByUser[win.userId] || false;

        return (
          <div
            key={win.userId}
            className="cw-window"
            style={{ right: `${16 + idx * 332}px` }}
          >
            <div className="cw-window-header">
              <div className="cw-window-avatar">
                {win.profileImage
                  ? <img src={win.profileImage} alt={win.username} />
                  : (win.username || 'U').charAt(0).toUpperCase()
                }
              </div>
              <div className="cw-window-title">{win.username}</div>
              {user?.role === 'admin' && (
                <button
                  type="button"
                  className="cw-window-delete"
                  onClick={() => handleDeleteConversation(win.userId)}
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="cw-window-close"
                onClick={() => closeWindow(win.userId)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            <div
              className="cw-window-messages"
              ref={el => { if (el) windowRefs.current[win.userId] = el; }}
            >
              {messages.length === 0 ? (
                <div className="cw-window-empty">No messages yet. Say hi! 👋</div>
              ) : (
                messages.map(msg => {
                  const isMine = user?.role === 'admin'
                    ? msg.sender_role === 'admin'
                    : msg.sender_role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`cw-msg-row ${isMine ? 'cw-msg-row--mine' : 'cw-msg-row--theirs'}`}
                    >
                      {!isMine && (
                        <div className="cw-msg-avatar">
                          {(win.username || msg.sender_name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="cw-msg-col">
                        {!isMine && msg.sender_name && (
                          <div className="cw-msg-sender">{msg.sender_name}</div>
                        )}
                        <div className={`cw-bubble ${isMine ? 'cw-bubble--mine' : 'cw-bubble--theirs'}`}>
                          {msg.text}
                        </div>
                        <div className="cw-msg-time">{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cw-window-input-row">
              <textarea
                className="cw-window-input"
                placeholder="Type a message"
                rows={1}
                value={inputText}
                onChange={e => setInputByUser(prev => ({ ...prev, [win.userId]: e.target.value }))}
                onKeyDown={e => handleKeyDown(e, win.userId)}
                disabled={sending}
              />
              <button
                type="button"
                className="cw-window-send"
                onClick={() => handleSend(win.userId)}
                disabled={sending || !inputText.trim()}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                <span>Send</span>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
