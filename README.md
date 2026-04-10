# WordPlay Arena

Multiplayer word games — play on your own device with friends.

## Games
1. **Word Chain Duel** — Last letter → first letter. Miss the 7s timer and you're out!

## Setup
```bash
npm install
npm run dev
```

> **Note:** The current multiplayer uses `window.storage` (Claude artifact persistent storage). For production, swap with a real backend (WebSocket + Redis, Firebase, Supabase Realtime, etc.).
