import { useEffect, useRef } from "react";

function VideoTile({ stream, isCameraOn, isMicOn, username, isLocal }) {
  const videoRef = useRef(null);

  useEffect(
    function () {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    },
    [stream],
  );

  function getInitials(name) {
    if (!name) return "?";
    return name.substring(0, 2).toUpperCase();
  }

  const tileWidth = isLocal ? "w-[100px]" : "w-[240px]";
  const tileHeight = isLocal ? "h-[70px]" : "h-[150px]";

  const initialsSize = isLocal ? "text-sm" : "text-2xl";
  const nameSize = isLocal ? "text-[9px]" : "text-xs";

  return (
    <div
      className={`
        relative ${tileWidth} ${tileHeight} rounded-xl overflow-hidden
        border border-white/10 flex-shrink-0
        bg-zinc-950/60 backdrop-blur-sm
      `}
    >
      {/* ── Video element — always rendered, hidden when camera off ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`
          w-full h-full object-cover
          ${isCameraOn && stream ? "block" : "hidden"}
        `}
      />

      {/* ── Camera OFF state — monochrome avatar ── */}
      {(!isCameraOn || !stream) && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-1">
          {/* Initials circle */}
          <div
            className={`
              ${isLocal ? "w-7 h-7 text-[10px]" : "w-12 h-12 text-base"}
              rounded-full bg-white text-black
              flex items-center justify-center
              font-bold uppercase
            `}
          >
            {getInitials(username)}
          </div>

          {/* Name — only show on remote tile (local tile is too small) */}
          {!isLocal && (
            <>
              <p className="text-white text-xs font-medium mt-1">
                {username || "Guest"}
              </p>
              <p className="text-zinc-500 text-[10px]">camera off</p>
            </>
          )}
        </div>
      )}

      {/* ── Name label — bottom-left corner (like Google Meet) ── */}
      {isCameraOn && stream && (
        <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
          <span className={`${nameSize} text-white font-medium drop-shadow-sm`}>
            {isLocal ? "you" : username || "Guest"}
          </span>
          {/* Muted mic indicator */}
          {!isMicOn && <span className="text-[10px]">🔇</span>}
        </div>
      )}

      {/* ── Muted indicator when camera is off too ── */}
      {(!isCameraOn || !stream) && !isMicOn && !isLocal && (
        <div className="absolute bottom-1.5 left-2">
          <span className="text-[10px]">🔇</span>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const dotColor = {
    idle: "bg-zinc-600",
    waiting: "bg-zinc-500",
    connecting: "bg-yellow-400",
    connected: "bg-green-400",
  };

  const label = {
    idle: "start a call",
    waiting: "waiting for participant...",
    connecting: "connecting...",
    connected: "connected",
  };

  return (
    <div className="flex items-center gap-1.5 px-1 mt-1">
      <div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[status] || "bg-zinc-600"}`}
      />
      <span className="text-[10px] text-zinc-400">{label[status] || ""}</span>
    </div>
  );
}

function VideoOverlay({
  localStream,
  remoteStream,
  isMicOn,
  isCameraOn,
  callStatus,
  username,
  remoteUsername,
}) {
  if (!localStream && callStatus === "idle") return null;

  return (
    <div
      className="absolute bottom-6 right-6 flex flex-col items-end gap-0 z-40"
      style={{ userSelect: "none" }}
    >
      {/* ── Remote tile (top, bigger) ── */}
      <VideoTile
        stream={remoteStream}
        isCameraOn={remoteStream !== null}
        isMicOn={true}
        username={remoteUsername}
        isLocal={false}
      />

      {/* ── Status dot under remote tile ── */}
      <StatusDot status={callStatus} />

      {/* ── Local tile (bottom, smaller) ── */}
      <div className="mt-1">
        <VideoTile
          stream={localStream}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          username={username}
          isLocal={true}
        />
      </div>
    </div>
  );
}

export default VideoOverlay;
