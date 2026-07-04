import { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { toastError } from "../lib/toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function useWebRTC(shareLink, username) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callStatus, setCallStatus] = useState("idle");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const hasInitiatedRef = useRef(false);
  const remoteSocketIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  async function startLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      console.log("🎥 Requesting camera + mic...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log("✅ Got local stream");
      return stream;
    } catch (err) {
      console.log("❌ getUserMedia failed:", err.message);
      toastError(
        "PERMISSION DENIED",
        "Camera and microphone required. Please allow access.",
      );
      return null;
    }
  }

  function createPeerConnection() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = function (event) {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");
        socket.emit("webrtc:ice-candidate", {
          shareLink: shareLink,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = function (event) {
      console.log("🎥 Got remote track!");
      setRemoteStream(event.streams[0]);
      setCallStatus("connected");
    };

    pc.onconnectionstatechange = function () {
      console.log("🔌 Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") setCallStatus("connected");
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setCallStatus("waiting");
        setRemoteStream(null);
      }
    };

    pcRef.current = pc;
    return pc;
  }

  function addLocalTracksToPc(pc, stream) {
    if (!stream) return;
    stream.getTracks().forEach(function (track) {
      pc.addTrack(track, stream);
    });
  }

  async function createAndSendOffer() {
    if (hasInitiatedRef.current) {
      console.log("⚠️ Already initiated, skipping");
      return;
    }
    hasInitiatedRef.current = true;

    const stream = await startLocalStream();
    if (!stream) {
      hasInitiatedRef.current = false;
      return;
    }

    const pc = createPeerConnection();
    addLocalTracksToPc(pc, stream);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", {
        shareLink: shareLink,
        offer: offer,
      });
      setCallStatus("connecting");
      console.log("📤 Sent WebRTC offer");
    } catch (err) {
      console.log("❌ createOffer failed:", err.message);
      hasInitiatedRef.current = false;
    }
  }

  async function handleIncomingOffer(offer, fromSocketId) {
    console.log("📥 Received WebRTC offer from:", fromSocketId);
    remoteSocketIdRef.current = fromSocketId;

    const stream = await startLocalStream();
    if (!stream) return;

    const pc = createPeerConnection();
    addLocalTracksToPc(pc, stream);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", {
        shareLink: shareLink,
        answer: answer,
      });
      setCallStatus("connecting");
      console.log("📤 Sent WebRTC answer");
    } catch (err) {
      console.log("❌ handleIncomingOffer failed:", err.message);
    }
  }

  async function handleIncomingAnswer(answer) {
    console.log("📥 Received WebRTC answer");
    if (!pcRef.current) return;
    try {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );

      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      console.log("✅ Remote description set from answer");
    } catch (err) {
      console.log("❌ handleIncomingAnswer failed:", err.message);
    }
  }

  async function handleIncomingIceCandidate(candidate) {
    if (!pcRef.current || !pcRef.current.remoteDescription) {
      console.log("🧊 Queuing ICE candidate (pc not ready)");
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.log("❌ addIceCandidate failed:", err.message);
    }
  }

  function handleRemoteLeave() {
    console.log("📵 Remote user left the call");
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    setCallStatus("waiting");
    hasInitiatedRef.current = false;
    pendingCandidatesRef.current = [];
  }

  function toggleMic() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(function (track) {
      track.enabled = !track.enabled;
    });
    setIsMicOn(function (prev) {
      return !prev;
    });
  }

  function toggleCamera() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(function (track) {
      track.enabled = !track.enabled;
    });
    setIsCameraOn(function (prev) {
      return !prev;
    });
  }

  function leaveCall() {
    socket.emit("webrtc:leave", { shareLink: shareLink });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(function (track) {
        track.stop();
      });
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus("idle");
    hasInitiatedRef.current = false;
    pendingCandidatesRef.current = [];
  }

  useEffect(
    function () {
      if (!shareLink || !username) return;

      function onOffer(data) {
        handleIncomingOffer(data.offer, data.fromSocketId);
      }
      function onAnswer(data) {
        handleIncomingAnswer(data.answer);
      }
      function onIceCandidate(data) {
        handleIncomingIceCandidate(data.candidate);
      }
      function onLeave() {
        handleRemoteLeave();
      }

      socket.on("webrtc:offer", onOffer);
      socket.on("webrtc:answer", onAnswer);
      socket.on("webrtc:ice-candidate", onIceCandidate);
      socket.on("webrtc:leave", onLeave);

      return function () {
        socket.off("webrtc:offer", onOffer);
        socket.off("webrtc:answer", onAnswer);
        socket.off("webrtc:ice-candidate", onIceCandidate);
        socket.off("webrtc:leave", onLeave);
      };
    },
    [shareLink, username],
  );

  useEffect(
    function () {
      if (!shareLink || !username) return;

      function onRoomUsers(users) {
        console.log("👥 Room users update:", users.length, "people");

        if (users.length !== 2) {
          if (users.length < 2) {
            setCallStatus("waiting");
          }
          return;
        }

        const me = users.find(function (u) {
          return u.socketId === socket.id;
        });
        const other = users.find(function (u) {
          return u.socketId !== socket.id;
        });

        if (!me || !other) return;

        remoteSocketIdRef.current = other.socketId;

        const iShouldInitiate = me.socketId < other.socketId;

        if (iShouldInitiate) {
          console.log("🎬 I am the initiator, sending offer...");
          setTimeout(function () {
            createAndSendOffer();
          }, 500);
        } else {
          console.log("🎬 I am the receiver, waiting for offer...");
          setCallStatus("waiting");
          startLocalStream();
        }
      }

      socket.on("room-users", onRoomUsers);
      return function () {
        socket.off("room-users", onRoomUsers);
      };
    },
    [shareLink, username],
  );

  useEffect(function () {
    return function () {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(function (track) {
          track.stop();
        });
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    callStatus,
    toggleMic,
    toggleCamera,
    leaveCall,
  };
}

export default useWebRTC;
