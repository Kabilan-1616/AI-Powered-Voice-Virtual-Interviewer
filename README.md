# AI Voice Interview Bot

An intelligent, voice-powered interview platform built as a college project. The system conducts real job interviews autonomously — it reads the candidate's resume, asks tailored questions, listens to spoken answers, follows up based on responses, and generates a full evaluation report for the recruiter.

---

## Features

- 🎙️ **Voice Interview** — fully hands-free, speaks questions aloud and listens to answers
- 📄 **Resume-Aware AI** — reads the candidate's uploaded resume and tailors every question to it
- 🧠 **Contextual Follow-ups** — understands answers and asks deeper follow-up questions naturally
- 📊 **Auto Evaluation Report** — generates scores, strengths, weaknesses, and hiring recommendation after each interview
- 🔗 **Unique Interview Links** — admin generates a one-time link per candidate
- 🔒 **Link Expiry** — interview links automatically expire after completion
- ⏱️ **Scheduled Interviews** — admin can set exact start and end times for each interview session
- ⏳ **Time Constraints** — candidates are strictly blocked from accessing the interview outside their scheduled window
- 🖼️ **Custom Branding** — consistent personalized company logo across applicant and admin portals
- 👥 **Role-Based Auth** — separate admin and candidate dashboards
- ⌨️ **Text Fallback** — candidates can switch to text mode if mic is unavailable

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| AI Model | Groq API — `llama-3.3-70b-versatile` |
| PDF Parsing | pdfjs-dist |
| Voice Input | react-speech-recognition (Web Speech API) |
| Voice Output | Web Speech Synthesis API |

---

## Project Structure

```
interview-bot/                  # React Frontend
├── src/
│   ├── context/
│   │   └── AuthContext.jsx     # Firebase auth state
│   ├── components/
│   │   ├── ProtectedRoute.jsx  # Role-based route guard
│   │   └── SessionCard.jsx     # Admin session card
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── AdminDashboard.jsx  # Manage all sessions
│   │   ├── CreateSession.jsx   # Create interview + generate link
│   │   ├── CandidateDashboard.jsx
│   │   ├── InterviewLanding.jsx  # Resume upload page
│   │   ├── InterviewRoom.jsx     # Live voice/text interview
│   │   └── SessionReport.jsx     # AI evaluation report
│   ├── firebase.js
│   └── App.jsx
│
interview-bot-backend/          # Node.js Backend
├── index.js                    # Express server + all API routes
├── .env                        # GROQ_API_KEY
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [Firebase](https://firebase.google.com) project
- A [Groq](https://console.groq.com) API key (free)

---

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/interview-bot.git
cd interview-bot
```

---

### 2. Firebase Setup

1. Go to [firebase.google.com](https://firebase.google.com) and create a project
2. Enable **Authentication** → Email/Password
3. Enable **Firestore Database** (start in test mode)
4. Go to Project Settings → Add a Web App → copy the config
5. Paste your config into `src/firebase.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. In Firestore → **Rules** tab, set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### 3. Frontend Setup

```bash
cd interview-bot
npm install
```

Create a `.env.local` file in the root:
```
VITE_BACKEND_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

---

### 4. Backend Setup

```bash
cd interview-bot-backend
npm install
```

Create a `.env` file:
```
GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key at [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

Start the backend:
```bash
npm run dev
```

---

### 5. Run the App

Make sure both servers are running:

| Server | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |

---

## How It Works

```
Admin creates session
        ↓
Unique interview link generated
        ↓
Candidate opens link → uploads resume
        ↓
Backend parses PDF → text saved to Firestore
        ↓
Interview starts → AI reads resume + role
        ↓
AI speaks question (SpeechSynthesis)
        ↓
Candidate speaks answer (SpeechRecognition)
        ↓
3 seconds silence → answer sent to Groq API
        ↓
AI generates follow-up → speaks it aloud
        ↓
Loop for 8–10 questions
        ↓
AI wraps up → transcript saved to Firestore
        ↓
Groq generates evaluation report
        ↓
Admin views scores, feedback, recommendation
```

---

## Modules Built

| Module | Description |
|--------|-------------|
| 1 | Project setup, Firebase auth, role-based routing |
| 2 | Admin panel, session creation, unique link generation |
| 3 | Candidate landing page, PDF resume upload and parsing |
| 4 | AI interview engine (Groq), contextual question generation |
| 5 | Voice interface — speech recognition and synthesis |
| 6 | AI evaluation report with scores and hiring recommendation |
| 7 | Deployment — Vercel (frontend) + Render (backend) |

---

## Deployment

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | [Vercel](https://vercel.com) | Free |
| Backend | [Render](https://render.com) | Free |
| Database | Firebase Firestore | Free tier |
| AI | Groq API | Free tier |

---

## Known Limitations

- Voice recognition works best on **Chrome** — Firefox is not supported (falls back to text mode automatically)
- Render free tier **sleeps after 15 minutes** of inactivity — first request may take ~30 seconds to wake up
- Resume must be a **text-based PDF** — scanned image PDFs cannot be parsed
- Speech recognition requires **microphone permission** in the browser

---

## Pages Overview

| Page | Route | Access |
|------|-------|--------|
| Login | `/login` | Public |
| Signup | `/signup` | Public |
| Admin Dashboard | `/admin` | Admin only |
| Create Session | `/admin/create` | Admin only |
| Session Report | `/admin/report/:id` | Admin only |
| Candidate Dashboard | `/candidate` | Candidate only |
| Interview Landing | `/interview/:id` | Public |
| Interview Room | `/interview/:id/start` | Public |

