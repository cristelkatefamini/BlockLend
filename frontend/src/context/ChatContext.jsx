import { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  return (
    <ChatContext.Provider value={{ open, setOpen, totalUnread, setTotalUnread }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChatWidget = () => useContext(ChatContext);
