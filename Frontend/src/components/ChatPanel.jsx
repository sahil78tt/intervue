import { useState, useEffect, useRef } from "react";
import socket from "../lib/socket";

function ChatPanel({ shareLink, username, messages, onClose }) {
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef(null);

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
    <div className="absolute top-12 right-0 bottom-0 w-88 bg-zinc-950 border-l border-white/5 flex flex-col z-50">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-4 border-b border-white/5 flex-shrink-0">
        <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
          Chat
        </span>
        <button
          onClick={onClose}
          className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-100 transition-colors duration-150"
        >
          close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <p className="text-zinc-600 text-xs font-mono">
            No messages yet. Say hello.
          </p>
        )}

        {messages.map(function (msg) {
          const isMe = msg.username === username;
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[8px] font-mono uppercase flex-shrink-0">
                  {getInitial(msg.username)}
                </div>
                <span className="text-xs text-zinc-100 font-medium">
                  {isMe ? "you" : msg.username}
                </span>
                <span className="text-[10px] font-mono text-zinc-600 ml-auto">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              <p className="ml-7 text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
                {msg.message}
              </p>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <textarea
          rows={2}
          value={inputText}
          onChange={function (e) {
            setInputText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full text-sm text-zinc-100 placeholder-zinc-600 bg-transparent border border-white/10 rounded-lg p-3 resize-none focus:border-white/20 transition-colors duration-150 font-mono mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-30"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
