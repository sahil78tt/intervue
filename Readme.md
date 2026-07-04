<p align="center">
  <img src="./Frontend/public/Intervue-Logo.png" alt="Intervue Logo" width="140" />
</p>

<h1 align="center">Intervue</h1>

<p align="center">
<strong>Real-time collaborative coding interviews with AI hints and live video</strong>
</p>

<p align="center">
A full-stack coding interview platform featuring shared Monaco editor with live cursors, WebRTC video calling, AI-powered hints via Groq LLM, real-time chat, and sandboxed code execution across 6 languages.
</p>

<p align="center">
<a href="#features">Features</a> •
<a href="#tech-stack">Tech Stack</a> •
<a href="#screenshots">Screenshots</a> •
<a href="#installation">Installation</a> •
<a href="#api-reference">API</a>
</p>

<p align="center">
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Socket.io-4.0-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
<img src="https://img.shields.io/badge/WebRTC-Native-333333?style=for-the-badge&logo=webrtc&logoColor=white" />
<img src="https://img.shields.io/badge/Yjs-CRDT-6C5CE7?style=for-the-badge" />
<img src="https://img.shields.io/badge/TailwindCSS-3.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Groq-LLM-F55036?style=for-the-badge" />
</p>

---

<p align="center">
<img src="./Frontend/public/screenshots/room.png" alt="Intervue Room Page" width="900" />
</p>

---

# Why Intervue?

Standard coding platforms let you write code. **Intervue** brings the entire interview into one workspace.

- Two people editing the same file, seeing each other's cursors in real time
- Face-to-face video calling built into the editor with picture-in-picture overlay
- AI-powered hints when the candidate is stuck, without giving away the solution
- Everything scoped to a room with a shareable link

Built for interviewers who want CoderPad-level collaboration without the price tag.

---

# Features

<table>
<tr>
<td width="50%">

### Real-time Collaborative Editor

Monaco Editor with Yjs CRDT for conflict-free simultaneous editing. Live cursors show where each participant is typing.

</td>
<td width="50%">

### WebRTC Video Calling

Peer-to-peer video and audio directly between browsers. Picture-in-picture overlay in the editor with mic and camera controls.

</td>
</tr>

<tr>
<td>

### AI Hints (Groq + Llama 3.3)

Contextual coding hints that reference the candidate's actual code without revealing the solution. Powered by Groq's fast LLM inference.

</td>
<td>

### Sandboxed Code Execution

Run code in 6 languages (JavaScript, Python, C++, C, Java, TypeScript) with JDoodle integration. Output and errors shown inline.

</td>
</tr>

<tr>
<td>

### Real-time Chat

Room-scoped chat with unread indicators. Messages persist across tab switches using lifted state.

</td>
<td>

### Live Presence

See who is currently in the room with monochrome avatars in the navbar. Updates in real time as users join and leave.

</td>
</tr>

<tr>
<td>

### Editable Problem Statement

Host can write and update the problem statement live. All participants see updates instantly via Socket.io broadcast.

</td>
<td>

### Rate-limited Secure Auth

JWT authentication with bcrypt hashing, rate limiting on login and register endpoints, and Helmet security headers.

</td>
</tr>
</table>

---

# Screenshots

<p align="center">
<img src="./Frontend/public/screenshots/dashboard.png" width="100%" alt="Dashboard with rooms and join input">
</p>

<br/>

<p align="center">
<img src="./Frontend/public/screenshots/hint.png" width="100%" alt="AI hint modal">
</p>

<br/>

<p align="center">
<img src="./Frontend/public/screenshots/video.png" width="100%" alt="Video call in progress">
</p>

---

# Tech Stack

### Frontend

```
React 19
Vite 5
Monaco Editor
Yjs (CRDT collaboration)
y-websocket
Socket.io Client
Zustand
React Router
TailwindCSS 3
Sonner (toasts)
```

### Backend

```
Node.js
Express
PostgreSQL (Neon)
Raw pg driver
Socket.io
JWT
bcryptjs
Helmet
express-rate-limit
```

### External Services

```
Groq API (Llama 3.3 70B)
JDoodle (code execution)
Google STUN (WebRTC NAT traversal)
Neon (PostgreSQL hosting)
```

---

# Architecture

```
Browser A                                            Browser B
    │                                                    │
    │  REST API + Socket.io                              │
    ├──────────────► Backend (Express + Socket.io) ◄─────┤
    │                        │                           │
    │                        ├─► PostgreSQL (Neon)       │
    │                        ├─► Groq API (AI hints)     │
    │                        └─► JDoodle (code exec)     │
    │                                                    │
    │  y-websocket (collaborative editor sync)           │
    ├──────────────► Yjs WebSocket Server ◄──────────────┤
    │                                                    │
    │  WebRTC peer-to-peer (video and audio)             │
    └────────────────────────────────────────────────────┘
                    (server not involved after handshake)
```

Three real-time channels working in parallel:

- **Socket.io** for presence, chat, and problem sync
- **y-websocket** for the collaborative editor (CRDT-based)
- **WebRTC** for direct peer-to-peer video (no server load)

---

# Project Structure

```
intervue/
│
├── Backend/
│   └── src/
│       ├── configs/
│       │   └── connect.js
│       ├── controllers/
│       │   ├── auth.controllers.js
│       │   ├── room.controllers.js
│       │   ├── execute.controllers.js
│       │   └── hint.controllers.js
│       ├── middlewares/
│       │   ├── isAuthorized.js
│       │   └── rateLimiters.js
│       ├── routes/
│       ├── sockets/
│       │   └── socketHandler.js
│       ├── database/
│       │   └── schema.sql
│       └── server.js
│
├── Frontend/
│   ├── public/
│   │   ├── Intervue-Logo.png
│   │   └── screenshots/
│   └── src/
│       ├── api/
│       ├── hooks/
│       │   └── useWebRTC.js
│       ├── components/
│       │   ├── VideoOverlay.jsx
│       │   ├── HintModal.jsx
│       │   ├── ConfirmModal.jsx
│       │   └── CreateRoomModal.jsx
│       ├── lib/
│       │   ├── socket.js
│       │   └── toast.jsx
│       ├── pages/
│       ├── store/
│       ├── App.jsx
│       └── main.jsx
│
└── README.md
```

---

# AI Hints

Contextual hints powered by Groq's Llama 3.3 70B. The system prompt constrains the AI to act as a supportive interviewer, never revealing the full solution.

```
POST /api/hint
```

Request body:

```json
{
  "problem_statement": "Reverse a linked list",
  "code": "function reverse(head) { }",
  "language": "javascript"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "hint": "You have the function signature ready. Think about what you need to track as you traverse — typically for reversal you need a way to remember the previous node."
  }
}
```

Rate-limited to 20 hints per user per hour to protect the Groq quota.

---

# API Reference

### Authentication

| Method | Endpoint           | Description    |
| ------ | ------------------ | -------------- |
| POST   | /api/auth/register | Create account |
| POST   | /api/auth/login    | Login          |
| GET    | /api/auth/me       | Current user   |

### Rooms

| Method | Endpoint                      | Description                |
| ------ | ----------------------------- | -------------------------- |
| POST   | /api/rooms                    | Create room                |
| POST   | /api/rooms/join/:shareLink    | Join room by share link    |
| GET    | /api/rooms/my                 | Get user's rooms           |
| GET    | /api/rooms/:shareLink         | Get room details           |
| PATCH  | /api/rooms/:shareLink/problem | Update problem (host only) |
| DELETE | /api/rooms/:id                | Delete room (soft delete)  |

### Code Execution and AI

| Method | Endpoint     | Description                |
| ------ | ------------ | -------------------------- |
| POST   | /api/execute | Run code (JDoodle sandbox) |
| POST   | /api/hint    | Get AI hint (Groq LLM)     |

---

# Real-time Events

### Socket.io Events

| Event                | Direction       | Purpose                        |
| -------------------- | --------------- | ------------------------------ |
| join-room            | Client → Server | Enter a room                   |
| leave-room           | Client → Server | Exit a room                    |
| user-joined          | Server → Client | Notify others of new user      |
| user-left            | Server → Client | Notify others of user leaving  |
| room-users           | Server → Client | Full list of active users      |
| problem-updated      | Bidirectional   | Sync problem statement changes |
| chat:send            | Client → Server | Send chat message              |
| chat:received        | Server → Client | Broadcast message to room      |
| webrtc:offer         | Bidirectional   | WebRTC SDP offer               |
| webrtc:answer        | Bidirectional   | WebRTC SDP answer              |
| webrtc:ice-candidate | Bidirectional   | WebRTC ICE exchange            |
| webrtc:leave         | Bidirectional   | Notify others of call end      |

---

# Security

- **Helmet** for HTTP security headers (clickjacking, MIME sniffing, HSTS)
- **CORS whitelist** — only accepted origins allowed
- **JWT authentication** on all protected routes
- **bcrypt password hashing** with salt
- **Rate limiting** on login (5 attempts per 15 min), register (3 per hour), and AI hints (20 per user per hour)
- **Body size limit** (100kb) to prevent DoS attacks
- **Ownership checks** in SQL queries so users cannot modify others' resources

---

# Installation

Clone repository

```bash
git clone https://github.com/sahil78tt/intervue.git
cd intervue
```

Install dependencies

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

Set up environment variables (see below), then run three terminals

```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Terminal 2 — y-websocket server (for collaborative editing)
cd Frontend
npm run ywebsocket

# Terminal 3 — Frontend
cd Frontend
npm run dev
```

Open `http://localhost:5173` in two browsers to test collaboration.

---

# Environment Variables

Create `.env` in `Backend/`

```
PORT=8003
NODE_ENV=development

# Neon PostgreSQL
DATABASE_URL=your_neon_connection_string

# JWT
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d

# JDoodle (code execution)
JDOODLE_CLIENT_ID=your_client_id
JDOODLE_CLIENT_SECRET=your_client_secret

# Groq (AI hints)
GROQ_API_KEY=gsk_your_key
GROQ_MODEL=llama-3.3-70b-versatile

# CORS (for production deploy)
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

# Design System

Intervue uses a strict monochrome design language inspired by tools like Linear and Vercel.

- Dark theme with zinc-based palette
- Flat design — no shadows, no gradients, no glassmorphism
- Pill buttons with hairline borders
- UPPERCASE mono labels with wide tracking for section headers
- Lowercase button labels for actions
- Tiny colored dots as the only splash of color (green for success, red for errors, amber for warnings)
- Sonner toasts fully overridden to match the aesthetic

---

# Roadmap

Completed

- Real-time collaborative editor with live cursors
- WebRTC video and audio calling
- AI hints via Groq LLM
- Room-scoped chat
- Live presence tracking
- Editable problem statement with real-time sync
- Sandboxed code execution across 6 languages
- Rate limiting and security hardening
- Runwai-style toast notifications

Future

- Live deployment
- Judge0 migration for real execution metrics
- Screen sharing via getDisplayMedia
- Group video calls (SFU-based)
- TURN server for strict firewalls
- Recording and playback

---

# License

MIT License

<p align="center">
© 2026 Sahil Vishwakarma
</p>
