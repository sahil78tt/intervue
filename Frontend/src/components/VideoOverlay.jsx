import { useEffect, useRef, useState } from "react";

function VideoOverlay({
  localStream,
  remoteStream,
  isMicOn,
  isCameraOn,
  callStatus,
  username,
  remoteUsername,
}) {
  var localVideoRef = useRef(null);
  var remoteVideoRef = useRef(null);
  var dragRef = useRef(null);
  var isDraggingRef = useRef(false);
  var dragOffsetRef = useRef({ x: 0, y: 0 });

  var [position, setPosition] = useState({ x: null, y: null });
  var [isCollapsed, setIsCollapsed] = useState(false);
  var [fadeClass, setFadeClass] = useState("opacity-0 translate-y-2");

  useEffect(
    function () {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    },
    [localStream],
  );

  useEffect(
    function () {
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    },
    [remoteStream],
  );

  useEffect(
    function () {
      if (localStream) {
        var timer = setTimeout(function () {
          setFadeClass("opacity-100 translate-y-0");
        }, 50);
        return function () {
          clearTimeout(timer);
        };
      } else {
        setFadeClass("opacity-0 translate-y-2");
      }
    },
    [localStream],
  );

  function startDrag(e) {
    if (e.target.closest("button")) return;
    isDraggingRef.current = true;

    var rect = dragRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    function onMove(ev) {
      if (!isDraggingRef.current) return;
      var newX = ev.clientX - dragOffsetRef.current.x;
      var newY = ev.clientY - dragOffsetRef.current.y;

      var maxX = window.innerWidth - rect.width - 8;
      var maxY = window.innerHeight - rect.height - 8;
      if (newX < 8) newX = 8;
      if (newY < 60) newY = 60;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;

      setPosition({ x: newX, y: newY });
    }

    function onUp() {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  if (!localStream) return null;

  var hasRemote = remoteStream !== null && remoteStream !== undefined;

  var containerStyle = {};
  if (position.x !== null) {
    containerStyle = {
      left: position.x + "px",
      top: position.y + "px",
      right: "auto",
      bottom: "auto",
    };
  }

  return (
    <div
      ref={dragRef}
      onMouseDown={startDrag}
      style={containerStyle}
      className={
        "absolute bottom-6 right-6 z-40 transition-all duration-200 ease-out cursor-move select-none " +
        fadeClass
      }
    >
      {/* Collapsed pill state */}
      {isCollapsed && (
        <div className="bg-surface-1 border border-hairline rounded-full pl-1 pr-3 py-1 flex items-center gap-2 shadow-2xl">
          <div className="flex items-center gap-1.5">
            <div
              className={
                "w-2 h-2 rounded-full " +
                (hasRemote
                  ? "bg-semantic-success animate-pulse"
                  : "bg-ink-tertiary")
              }
            />
            <span className="text-[11px] text-ink-muted font-medium">
              {hasRemote ? "On call" : "Waiting..."}
            </span>
          </div>
          <button
            onClick={function () {
              setIsCollapsed(false);
            }}
            className="text-[10px] text-ink-tertiary hover:text-ink transition-colors duration-150 px-1"
          >
            ⤢
          </button>
        </div>
      )}

      {/* Expanded video card */}
      {!isCollapsed && (
        <div className="bg-surface-1 border border-hairline rounded-xl overflow-hidden shadow-2xl w-[280px]">
          {/* Header */}
          <div className="h-8 flex items-center justify-between px-3 border-b border-hairline bg-surface-2">
            <div className="flex items-center gap-1.5">
              <div
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (hasRemote
                    ? "bg-semantic-success animate-pulse"
                    : "bg-ink-tertiary")
                }
              />
              <span className="text-[10px] font-medium text-ink-tertiary uppercase tracking-widest">
                {hasRemote ? "Live" : "Waiting"}
              </span>
            </div>
            <button
              onClick={function () {
                setIsCollapsed(true);
              }}
              className="text-ink-tertiary hover:text-ink text-[12px] w-5 h-5 flex items-center justify-center rounded transition-colors duration-150"
              title="Minimize"
            >
              −
            </button>
          </div>

          {/* Remote video (main) */}
          <div className="relative aspect-video bg-canvas">
            {hasRemote ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-surface-3 border border-hairline flex items-center justify-center">
                  <span className="text-[14px] font-medium text-ink-muted uppercase">
                    {remoteUsername ? remoteUsername.substring(0, 2) : "??"}
                  </span>
                </div>
                <span className="text-[11px] text-ink-tertiary font-medium">
                  Waiting for peer...
                </span>
              </div>
            )}

            {/* Remote name badge */}
            {hasRemote && (
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                <span className="text-[10px] text-white font-medium">
                  {remoteUsername}
                </span>
              </div>
            )}

            {/* Local video PiP (Meet style) */}
            <div className="absolute bottom-2 right-2 w-20 h-14 rounded-lg overflow-hidden border border-white/20 bg-canvas">
              {isCameraOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-2">
                  <span className="text-[10px] font-medium text-ink-muted uppercase">
                    {username ? username.substring(0, 2) : "??"}
                  </span>
                </div>
              )}

              {/* Mic indicator on local PiP */}
              {!isMicOn && (
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center">
                  <span className="text-[8px] text-white">🔇</span>
                </div>
              )}
            </div>
          </div>

          {/* Status footer */}
          <div className="h-7 flex items-center justify-between px-3 bg-surface-2 border-t border-hairline">
            <span className="text-[10px] font-medium text-ink-tertiary">
              You: {username}
            </span>
            <div className="flex items-center gap-1.5">
              {!isMicOn && (
                <span className="text-[10px] text-red-400/80">🔇</span>
              )}
              {!isCameraOn && (
                <span className="text-[10px] text-red-400/80">📷</span>
              )}
              {isMicOn && isCameraOn && (
                <span className="text-[10px] text-semantic-success">●</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoOverlay;
