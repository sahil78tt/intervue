import { useState, useEffect, useRef } from "react";
import socket from "../lib/socket";

function ChatPanel({ shareLink, username, messages, onClose }) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(
    function () {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [messages],
  );

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    socket.emit("chat:send", {
      shareLink: shareLink,
      username: username,
      message: trimmed,
    });
    setInputText("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitial(name) {
    return name ? name.substring(0, 2).toUpperCase() : "?";
  }

  return (
    <div className="absolute top-16 right-0 bottom-0 w-96 bg-white border-l border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          Chat
        </p>
        <button
          onClick={onClose}
          className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
        >
          close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm">No messages yet. Say hello.</p>
        )}

        {messages.map(function (msg) {
          const isMe = msg.username === username;
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0">
                  {getInitial(msg.username)}
                </div>
                <span className="text-xs text-black font-semibold">
                  {isMe ? "you" : msg.username}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="ml-8 text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
                {msg.message}
              </p>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <textarea
          rows={2}
          value={inputText}
          onChange={function (e) {
            setInputText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full text-sm text-black placeholder-gray-400 bg-white border border-gray-200 p-3 resize-none focus:border-black transition-colors font-sans mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="h-8 px-4 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-30"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
