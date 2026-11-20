# CONFAB — Connect Beyond Conversations

> A modern, premium real-time messaging web platform inspired by WhatsApp, Telegram, and Instagram.

---

## 🌟 Key Features

### 1. Authentication & Security
- **Mobile Number Authentication**: International format phone number validation (with +91 support).
- **OTP Verification**: Secure 6-digit verification code with rate limiting and automated verification.
- **JWT Authentication**: Secure Access and Refresh tokens with Bcrypt password hashing.
- **Session Handling**: Remember me, forgot password with OTP reset, and secure logout.

### 2. Contact Management & Verification
- **Add Contacts**: Add contacts via phone number with automatic duplicate checking and format validation.
- **Confab Registration Verification**: Checks if a phone number belongs to an existing registered Confab user.
  - If registered: Displays profile, username, signature emoji, and enables instant 1-on-1 chat.
  - If unregistered: Displays "Not on Confab yet" with a one-click "Invite to Confab" option. Automatically enables chat without re-adding when they register.
- **My Lists (Custom Categories)**: Organize contacts into Favorites, Personal, Business, Family, Friends, or custom lists.
- **Edit & Delete Contacts**: Change saved contact display names and categories.

### 3. Real-Time One-to-One Messaging
- **Instant Delivery**: Sub-millisecond messaging via WebSocket / Socket.IO.
- **Message Status Indicators**:
  - `Sending`: Clock icon
  - `Sent`: Single checkmark
  - `Delivered`: Double checkmark
  - `Read`: Double sky blue checkmark
- **Message Actions**: Reply to messages, Edit sent messages with `(edited)` label, Delete (for me / for everyone), Copy, Pin important messages, and Star messages.
- **Emoji Reactions**: React with any emoji in real-time.
- **Live Typing Indicator**: "Raj is typing..." with automatic timeout.
- **Online / Last Seen Status**: Real-time presence tracking respecting user privacy settings.
- **In-Chat Search**: Filter messages within any conversation.

### 4. Rich Media & Attachments
- **Photos & Videos**: Full-screen preview, thumbnail caching, and download.
- **Documents**: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT with file type icon and size badge.
- **Voice Messages**: Browser audio recording with live waveform, duration timer, play/pause preview, and send.
- **Group Polls**: Real-time interactive polling with multiple selections and percentage bars.
- **Custom Wallpapers**: Solid colors, atmospheric gradients, built-in wallpapers, and custom image uploads.

### 5. Group Chats
- **Creation**: Create groups with 2+ registered contacts, avatar, name, and description.
- **Automatic Sync**: New groups automatically appear in every member's conversation list in real-time.
- **Role Permissions**: Creator, Admin, and Member roles with member removal/addition controls.

### 6. Chronicle (Confab Stories)
- **24-Hour Expiration**: Automatic server-side expiration after 24 hours.
- **Photo, Video & Text Stories**: Custom gradient backgrounds, captions, and emojis.
- **Interactive Viewer**: Progress bars, pause on hold, next/previous navigation.
- **Reactions & Replies**: Quick emoji reactions and direct private chat replies.
- **Viewers Tracking**: See who viewed your story with timestamps.

### 7. WebRTC Audio & Video Calls
- **Real-Time Calling**: Peer-to-peer audio and video calling powered by WebRTC and STUN servers.
- **Call Controls**: Mute microphone, toggle camera, full-screen video, PiP local view, and live call timer.
- **Incoming Call Modal**: Ringing notification dialog with Accept and Decline buttons.
- **Call History Log**: Incoming, outgoing, and missed call logs with duration and instant callback.

### 8. Five Premium Themes
- **Night Mode** (Default): Obsidian slate dark mode.
- **Premium Light**: Clean porcelain white aesthetic with sharp typography.
- **Ocean Blue**: Deep midnight azure.
- **Lavender**: Velvet dusk purple.
- **Forest Green**: Sophisticated emerald and moss.

### 9. Signature Emoji
- Personal emoji branding displayed 3-4 spaces after the user's name across chat headers, member lists, search results, and contact lists.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- MongoDB (Local service or MongoDB Atlas cluster URI)

### Backend Setup
```bash
cd backend

# Configure environment variables
cp .env.example .env

# Run FastAPI server
python -m uvicorn app.main:combined_asgi_app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

Open **http://127.0.0.1:5173** in your browser.

---

## 🧪 Testing Accounts (Pre-Seeded)

| Account | Mobile Number | Username | Password | Signature Emoji |
|---------|---------------|----------|----------|-----------------|
| Raj Kumar | `+919876543210` | `rajesh_k` | `Password123!` | 🚀 |
| Priya Sharma | `+919876543211` | `priya_s` | `Password123!` | ✨ |

*(Default Demo OTP: `123456`)*
