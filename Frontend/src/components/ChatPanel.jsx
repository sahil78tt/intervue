import { useState, useEffect, useRef } from "react";
import socket from "../lib/socket";

function ChatPanel({ shareLink, username, messages, onClose }) {
  var [inputText, setInputText] = useState("");
  var bottomRef = useRef(null);

  useEffect(
    function () {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [messages],
  );

  function handleSend() {
    var trimmed = inputText.trim();
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
    <div className="absolute top-12 right-0 bottom-0 w-80 bg-canvas border-l border-hairline flex flex-col z-50">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-hairline flex-shrink-0">
        <span className="text-[10px] font-mono text-ink-tertiary uppercase tracking-widest">
          Chat
        </span>
        <button
          onClick={onClose}
          className="text-[10px] font-mono text-ink-tertiary uppercase tracking-widest hover:text-ink transition-colors duration-150"
        >
          close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <p className="text-ink-tertiary text-[11px] font-mono">
            No messages yet. Say hello.
          </p>
        )}

        {messages.map(function (msg) {
          var isMe = msg.username === username;
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              {/* Avatar + name + time */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-surface-3 border border-hairline flex items-center justify-center text-[8px] font-mono uppercase text-ink-muted flex-shrink-0">
                  {getInitial(msg.username)}
                </div>
                <span className="text-[12px] text-ink font-medium">
                  {isMe ? "you" : msg.username}
                </span>
                <span className="text-[10px] font-mono text-ink-tertiary ml-auto">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Message body */}
              <p className="ml-7 text-[13px] text-ink-subtle leading-relaxed whitespace-pre-wrap break-words">
                {msg.message}
              </p>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-hairline flex-shrink-0">
        <textarea
          rows={2}
          value={inputText}
          onChange={function (e) {
            setInputText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full text-[13px] text-ink placeholder:text-ink-tertiary placeholder:font-mono bg-surface-1 border border-hairline rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-hairline-strong transition-colors duration-150 mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="text-[11px] font-mono text-ink-subtle uppercase tracking-widest border border-hairline bg-surface-1 px-4 py-1.5 rounded-full hover:bg-surface-2 hover:text-ink transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
