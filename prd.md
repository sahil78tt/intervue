# Product Requirements Document (PRD)

# Intervue

**Real-time Technical Interview Platform**

---

# 1. Product Overview

**Product Name:** Intervue
**Version:** 1.0.0
**Product Type:** Real-time Technical Interview Platform

Intervue is a real-time technical interview platform designed for conducting live coding interviews without the need for screen sharing or third-party tools. It combines a shared Monaco-based code editor powered by Yjs CRDTs, sandboxed multi-language code execution via Judge0, WebRTC-based video and audio calling, and an AI-powered hint system — enabling interviewers and candidates to collaborate in the same coding environment, communicate face to face, and solve problems together in real time.

---

# 2. Target Users

- **Interviewers / Hiring Managers:** Create interview rooms, set coding problems, observe candidate code in real time, communicate via video and audio
- **Candidates:** Join interview rooms via unique share link, write and execute code, receive AI-powered hints, communicate with interviewer via video
- **Pair Programmers:** Developers who want to write code together in real time with live cursor sync and voice communication
- **Educators / Mentors:** Teachers who want to code live alongside students with full cursor and presence visibility

---

# 3. Core Features

## 3.1 User Authentication & Authorization

- **User Registration:** Account creation with username, email, and password
- **User Login:** Secure authentication with JWT access tokens
- **Token Management:** Access token stored in memory, refresh via secure HTTP-only cookie
- **Protected Routes:** All room and execution routes require valid JWT
- **Password Hashing:** bcryptjs with salt rounds for all stored passwords
- **Role-Based Access Control:** Per-room role system — Host and Participant only

## 3.2 Room Management

- **Room Creation:** Host creates a named interview room with selected language
- **Unique Share Link:** Auto-generated 10-character nanoid URL for each room
- **Room Joining:** Any authenticated user with the share link can join as Participant
- **Room Roles:** Host has full control, Participant can edit and execute code
- **Room Expiry:** Rooms auto-expire 24 hours after creation
- **Active Rooms Dashboard:** User sees all rooms they created with share link copy option
- **Room Deletion:** Host can delete rooms from dashboard

## 3.3 Real-time Collaborative Code Editor

- **Monaco Editor Integration:** Full VS Code-like editor experience in the browser
- **Yjs CRDT Sync:** Conflict-free real-time collaboration — multiple users edit simultaneously without conflicts
- **Live Cursors:** See every participant's cursor position and name label with unique color in real time
- **Syntax Highlighting:** Support for JavaScript, Python, Java, C++, and Go
- **Language Switcher:** Change language mid-session with instant re-highlighting for all participants
- **Custom Dark Theme:** Intervue-branded dark theme matching the overall UI
- **Default Code Templates:** Each language starts with a ready-to-use function template

## 3.4 Code Execution Engine

- **Sandboxed Execution:** Run code securely via Judge0 API — isolated from Intervue servers entirely
- **Multi-language Support:** Execute JavaScript, Python, Java, C++, and Go
- **Output Panel:** stdout, stderr, execution time, and memory usage displayed below the editor
- **Run Button:** One-click code execution with loading state feedback
- **Execution Polling:** Poll Judge0 every 1 second for result — max 10 attempts before timeout
- **Rate Limiting:** Maximum 10 executions per minute per IP to prevent abuse
- **Status Display:** Accepted, Wrong Answer, Runtime Error, Time Limit Exceeded shown clearly

## 3.5 Video & Audio Calling

- **WebRTC Peer-to-Peer:** Direct browser-to-browser video and audio — no media server required for 1:1 calls
- **STUN Support:** Google STUN servers for NAT traversal
- **WebSocket Signaling:** SDP offer/answer and ICE candidate exchange via Socket.io
- **Mute / Unmute:** Toggle audio track without dropping the connection
- **Camera On / Off:** Toggle video track without dropping the connection
- **Floating PiP Layout:** Local video shown small, remote video shown above it — fixed to bottom right corner over the editor
- **Auto Offer:** When second user joins room, WebRTC offer is triggered automatically

## 3.6 Problem Statement Panel

- **Problem Panel:** Host writes and sends a coding problem visible to all participants in real time
- **Real-time Sync:** Problem statement pushed via Socket.io — candidate sees it instantly when host saves
- **Persistence:** Problem statement saved to PostgreSQL on every update
- **Panel on Join:** When a user joins an existing room, current problem is fetched and displayed automatically
- **Collapsible Panel:** Participants can collapse the panel to a thin strip to maximize editor space
- **Host-only Editing:** Only the Host role can edit or update the problem statement

## 3.7 Real-time Chat

- **In-room Chat:** Text chat visible to all participants in the room
- **Real-time Delivery:** Messages broadcast via Socket.io to all connected users instantly
- **User Identity:** Each message shows username, avatar initial, and timestamp
- **No Persistence:** Chat is session-only — messages are not stored in database
- **Collapsible Panel:** Fixed width panel on the right side of the layout

## 3.8 AI Hint System

- **Hint Button:** One-click button in the top navbar available to all participants
- **Context-aware Hints:** OpenAI analyzes the current problem statement and candidate's current code to generate a relevant hint
- **Non-revealing Hints:** System prompt instructs AI to guide without revealing the solution or writing code
- **Concise Output:** Hints capped at 150 tokens — maximum 3 sentences
- **Popup Display:** Hint appears in a floating popup below the button — dismissible
- **Rate Limiting:** Maximum 5 hint requests per minute per IP
- **Requires Problem:** Hint button shows error toast if no problem statement has been set

## 3.9 Active Users & Presence

- **Online Indicators:** Color-coded avatar circles in navbar showing who is currently in the room
- **Yjs Awareness:** Presence powered by Yjs awareness protocol — automatically updates on join and leave
- **User Count:** Online count shown next to presence avatars
- **Cursor Colors:** Each user gets a random unique color assigned on join — used for both cursor and avatar

---

# 4. Technical Specifications

## 4.1 API Endpoints Structure

### Authentication Routes (`/api/auth/`)

- `POST /register` — Create new user account
- `POST /login` — Authenticate user, return JWT token
- `POST /logout` — Clear session (secured)
- `GET /me` — Get current authenticated user info (secured)

### Room Routes (`/api/rooms/`)

- `GET /my` — List all rooms created by current user (secured)
- `POST /` — Create new interview room (secured)
- `GET /:shareLink` — Get room details by share link (secured)
- `DELETE /:id` — Delete room by ID (secured, Host only)
- `POST /join/:shareLink` — Join a room via share link (secured)

### Code Execution Routes (`/api/execute/`)

- `POST /run` — Execute code via Judge0, return stdout/stderr/time/memory (secured, rate-limited)

### Hint Routes (`/api/hint/`)

- `POST /` — Generate AI hint from problem + current code via OpenAI (secured, rate-limited)

### Health Check (`/api/health/`)

- `GET /` — Server health status

## 4.2 Permission Matrix

| Feature               | Host | Participant |
| --------------------- | :--: | :---------: |
| Create Room           |  ✓   |      ✗      |
| Delete Room           |  ✓   |      ✗      |
| Set Problem Statement |  ✓   |      ✗      |
| Edit Code             |  ✓   |      ✓      |
| View Code and Cursors |  ✓   |      ✓      |
| Execute Code          |  ✓   |      ✓      |
| Request AI Hint       |  ✓   |      ✓      |
| Video and Audio Call  |  ✓   |      ✓      |
| Send Chat Messages    |  ✓   |      ✓      |
| Copy Share Link       |  ✓   |      ✓      |

## 4.3 Data Models

### User

```
id             UUID PRIMARY KEY
username       VARCHAR(50) UNIQUE NOT NULL
email          VARCHAR(100) UNIQUE NOT NULL
password_hash  VARCHAR(255) NOT NULL
avatar_url     TEXT
created_at     TIMESTAMP DEFAULT NOW()
```

### Room

```
id                 UUID PRIMARY KEY
name               VARCHAR(100) NOT NULL
owner_id           UUID REFERENCES users(id)
share_link         VARCHAR(20) UNIQUE NOT NULL
language           VARCHAR(50) DEFAULT 'javascript'
problem_statement  TEXT
is_active          BOOLEAN DEFAULT true
created_at         TIMESTAMP DEFAULT NOW()
expires_at         TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
```

### Room Participants

```
id         UUID PRIMARY KEY
room_id    UUID REFERENCES rooms(id)
user_id    UUID REFERENCES users(id)
role       VARCHAR(20) DEFAULT 'participant'   -- 'host' | 'participant'
joined_at  TIMESTAMP DEFAULT NOW()
UNIQUE(room_id, user_id)
```

### Room Status

- `active` — Room is open, participants can join and code
- `expired` — Room has passed its 24-hour expiry, no new joins allowed

### Execution Status (Judge0)

- `pending` — Submitted to Judge0, awaiting processing
- `running` — Currently executing
- `accepted` — Completed successfully with stdout output
- `runtime_error` — Completed with stderr output
- `time_limit_exceeded` — Exceeded 10-second execution cap

---

# 5. Tech Stack

| Layer           | Technology                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------ |
| Frontend        | React, Vite, Monaco Editor, Yjs, y-websocket, y-monaco, TailwindCSS, Zustand, Lucide React |
| Backend         | Node.js, Express, Socket.io, ws, y-websocket server                                        |
| Database        | PostgreSQL (users, rooms, participants), Redis (rate limiting)                             |
| Real-time Sync  | Yjs CRDTs over WebSocket (y-websocket)                                                     |
| Video and Audio | WebRTC (RTCPeerConnection), Google STUN servers                                            |
| Code Execution  | Judge0 API via RapidAPI                                                                    |
| AI Hints        | OpenAI API (gpt-4o-mini)                                                                   |
| Auth            | JWT (jsonwebtoken), bcryptjs                                                               |
| File Uploads    | Cloudinary (avatar images)                                                                 |
| Deployment      | Vercel (frontend), Render (backend), Supabase (PostgreSQL), Upstash (Redis)                |

---

# 6. Socket Events Reference

## Client → Server Events

| Event                  | Payload                                    | Description                              |
| ---------------------- | ------------------------------------------ | ---------------------------------------- |
| `room:join`            | `{ roomId, username }`                     | Join a socket room and announce presence |
| `room:leave`           | `{ roomId }`                               | Leave a socket room                      |
| `chat:send`            | `{ roomId, message, username, avatarUrl }` | Send chat message to room                |
| `problem:update`       | `{ roomId, statement }`                    | Host updates problem statement           |
| `problem:get`          | `{ roomId }`                               | Request current problem on join          |
| `webrtc:offer`         | `{ roomId, offer }`                        | Send WebRTC offer to peer                |
| `webrtc:answer`        | `{ roomId, answer }`                       | Send WebRTC answer to peer               |
| `webrtc:ice-candidate` | `{ roomId, candidate }`                    | Send ICE candidate to peer               |

## Server → Client Events

| Event                  | Payload                                           | Description                           |
| ---------------------- | ------------------------------------------------- | ------------------------------------- |
| `room:userJoined`      | `{ socketId, username }`                          | Another user joined the room          |
| `room:userLeft`        | `{ socketId }`                                    | A user disconnected from room         |
| `chat:received`        | `{ id, username, avatarUrl, message, timestamp }` | Incoming chat message                 |
| `problem:updated`      | `{ statement }`                                   | Problem statement was updated by host |
| `webrtc:offer`         | `{ offer, from }`                                 | Incoming WebRTC offer from peer       |
| `webrtc:answer`        | `{ answer, from }`                                | Incoming WebRTC answer from peer      |
| `webrtc:ice-candidate` | `{ candidate, from }`                             | Incoming ICE candidate from peer      |

---

# 7. Security

- JWT-based authentication enforced on all protected API routes via middleware
- All passwords hashed with bcryptjs before storage — plaintext never stored
- Code execution fully sandboxed via Judge0 — zero user code runs on Intervue servers
- Rate limiting on `/execute/run` — 10 requests per minute per IP
- Rate limiting on `/hint` — 5 requests per minute per IP
- CORS configured to allow only the deployed frontend origin
- Socket.io connections scoped to rooms — users only receive events for their room
- Room share links are random 10-character nanoid strings — practically unguessable
- Input validation on all API request bodies before processing

---

# 8. Real-time Architecture

```
Yjs WebSocket Server (y-websocket)
→ Handles collaborative text editing
→ CRDT conflict resolution for simultaneous edits
→ Awareness protocol for live cursor positions and user colors
→ Runs on same HTTP server as Express, differentiated by upgrade header

Socket.io Server
→ WebRTC signaling: offer, answer, ICE candidate exchange
→ Room presence: userJoined, userLeft events
→ Chat message broadcast to room
→ Problem statement sync from host to all participants

WebRTC (browser to browser)
→ Offer/Answer exchanged via Socket.io signaling
→ ICE candidates exchanged via Socket.io
→ Direct P2P media stream after handshake — no server involved
→ Google STUN servers for NAT traversal
```

---

# 9. Non-Functional Requirements

## Performance

- Real-time editor sync latency under 100ms on same network
- Code execution response returned within 10 seconds for all supported languages
- WebRTC call established within 5 seconds on standard networks
- Dashboard room list loads within 1 second

## Reliability

- Rooms persist in PostgreSQL — survive server restarts
- Yjs document state maintained in memory per session
- Automatic reconnection handling for WebSocket disconnects
- Judge0 polling with 10 retry attempts before timeout error

## Scalability

- Redis used for rate limiting — stateless across server restarts
- PostgreSQL connection pooling via pg Pool
- Frontend deployed on Vercel CDN — globally distributed

## Browser Support

- Chrome 90+ (primary target)
- Firefox 88+
- Edge 90+
- Safari 14+ (WebRTC limitations noted)

---

# 10. Success Criteria

- Two users can edit the same file simultaneously with zero conflicts and sub-100ms sync latency
- Code executes in sandboxed Judge0 environment within 10 seconds for all 5 supported languages
- WebRTC video and audio call establishes successfully between two users on different networks
- Room share link works — any authenticated user with the link can join without additional setup
- Live cursors visible for all active participants with correct name labels and unique colors
- Host sets problem statement and candidate sees it within 1 second via Socket.io
- AI hint is generated and displayed within 5 seconds of button click
- Zero user code executed on Intervue servers — full Judge0 sandboxing enforced at all times
- Rooms automatically become inaccessible after 24-hour expiry
- All core features functional on Chrome, Firefox, and Edge browsers

---

# 11. Out of Scope (v1.0)

The following features are explicitly excluded from version 1.0 to maintain scope and ship a polished MVP:

- Session recording and playback
- PDF or code export
- File tree or multi-file editing
- Observer role (read-only third participant)
- Password-protected rooms
- Version history or time-travel
- Terminal integration
- Google OAuth or social login
- Pre-built problem library
- Mobile or tablet support
- TURN server for users behind strict firewalls

---

_Document Version: 1.0.0_
_Product: Intervue_
_Last Updated: June 2026_
