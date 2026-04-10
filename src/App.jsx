import { useState, useEffect, useRef } from "react";

const POLL_MS = 600;
const TURN_TIME = 7;

async function getRoom(code) {
  try {
    const r = await window.storage.get(`wpa:${code}`, true);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}

async function setRoom(code, data) {
  try {
    await window.storage.set(`wpa:${code}`, JSON.stringify(data), true);
  } catch (e) { console.error("Storage error", e); }
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

const STARTER_WORDS = [
  "apple","bridge","castle","dragon","eagle","flame","ghost","harvest",
  "island","jungle","knight","lemon","marble","needle","ocean","planet",
  "quartz","river","storm","tower","urban","violet","whale","yellow","zephyr"
];

export default function App() {
  const [screen, setScreen] = useState("hub");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        :root {
          --bg: #0b0b10; --card: #161620; --border: #252535; --text: #ebebf0;
          --sub: #65657a; --accent: #ff6347; --accent2: #ffa04c; --green: #4ade80; --red: #ff4060;
          --input-bg: #1c1c28;
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f6f2ed; --card: #fff; --border: #e4dfd8; --text: #18181f;
            --sub: #8a857e; --accent: #e85535; --accent2: #e08830; --green: #22a85a; --red: #d63050;
            --input-bg: #fff;
          }
        }
        * { box-sizing: border-box; margin: 0; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: var(--sub); }
        input, button { font-family: inherit; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .btn {
          border: none; border-radius: 14px; padding: 16px 32px; font-weight: 800; font-size: 15px;
          letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all 0.15s;
          font-family: inherit; width: 100%;
        }
        .btn:active { transform: scale(0.97); }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-secondary { background: var(--card); color: var(--text); border: 2px solid var(--border); }
        .input {
          width: 100%; padding: 14px 16px; border-radius: 12px; border: 2px solid var(--border);
          background: var(--input-bg); color: var(--text); font-size: 17px; font-weight: 600;
          outline: none; font-family: inherit; transition: border-color 0.2s;
        }
        .input:focus { border-color: var(--accent); }
      `}</style>

      {screen === "hub" && <Hub onGo={(s, code, name) => { setScreen(s); setRoomCode(code); setPlayerName(name); }} />}
      {screen === "lobby" && <LobbyScreen code={roomCode} name={playerName} onStart={() => setScreen("play_chain")} onBack={() => setScreen("hub")} />}
      {screen === "play_chain" && <ChainGame code={roomCode} playerName={playerName} onBack={() => setScreen("hub")} />}
    </div>
  );
}

function Hub({ onGo }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    const code = genCode();
    const room = {
      code, game: "chain", phase: "lobby",
      players: [{ id: Date.now().toString(36), name: name.trim(), alive: true, score: 0 }],
      host: 0, chain: [], usedWords: [], currentIdx: 0, turnStart: 0, message: "", lastUpdate: Date.now()
    };
    await setRoom(code, room);
    onGo("lobby", code, name.trim());
  };

  const join = async () => {
    if (!name.trim() || joinCode.length < 4) return;
    const room = await getRoom(joinCode.toUpperCase());
    if (!room) { setError("Room not found"); return; }
    if (room.phase !== "lobby") { setError("Game already started"); return; }
    if (room.players.length >= 6) { setError("Room is full"); return; }
    if (room.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) { setError("Name taken"); return; }
    room.players.push({ id: Date.now().toString(36), name: name.trim(), alive: true, score: 0 });
    room.lastUpdate = Date.now();
    await setRoom(joinCode.toUpperCase(), room);
    onGo("lobby", joinCode.toUpperCase(), name.trim());
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 14, color: "var(--sub)", letterSpacing: 6, textTransform: "uppercase", marginBottom: 8 }}>⚡ Multiplayer</div>
        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>
          Word<span style={{ color: "var(--accent)" }}>Play</span>
        </h1>
        <div style={{ fontSize: 12, color: "var(--sub)", letterSpacing: 4, textTransform: "uppercase", marginTop: 6 }}>Arena</div>
      </div>

      {!mode && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          <button className="btn btn-primary" onClick={() => setMode("create")}>Create Room</button>
          <button className="btn btn-secondary" onClick={() => setMode("join")}>Join Room</button>
        </div>
      )}

      {mode && (
        <div className="fade-up" style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={12} autoFocus />
          {mode === "join" && (
            <input className="input" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
              placeholder="Room code" maxLength={4} style={{ textAlign: "center", letterSpacing: 8, fontSize: 24, textTransform: "uppercase" }} />
          )}
          {error && <div style={{ color: "var(--red)", fontSize: 13, textAlign: "center", fontWeight: 700 }}>{error}</div>}
          <button className="btn btn-primary" onClick={mode === "create" ? create : join}>
            {mode === "create" ? "Create" : "Join"}
          </button>
          <button className="btn btn-secondary" onClick={() => { setMode(null); setError(""); }}>Back</button>
        </div>
      )}
    </div>
  );
}

function LobbyScreen({ code, name, onStart, onBack }) {
  const [room, setRoomState] = useState(null);
  const pollRef = useRef(null);
  const isHost = room?.players?.[0]?.name === name;

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const r = await getRoom(code);
      if (!active) return;
      if (r) {
        setRoomState(r);
        if (r.phase === "playing") { onStart(); return; }
      }
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { active = false; clearTimeout(pollRef.current); };
  }, [code, name, onStart]);

  const startGame = async () => {
    const r = await getRoom(code);
    if (!r || r.players.length < 2) return;
    const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
    r.phase = "playing";
    r.chain = [{ word: starter, player: "🎲" }];
    r.usedWords = [starter.toLowerCase()];
    r.currentIdx = 0;
    r.turnStart = Date.now();
    r.message = "";
    r.lastUpdate = Date.now();
    await setRoom(code, r);
  };

  const leave = async () => {
    const r = await getRoom(code);
    if (r) {
      r.players = r.players.filter(p => p.name !== name);
      r.lastUpdate = Date.now();
      await setRoom(code, r);
    }
    onBack();
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "var(--sub)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>Room Code</div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 12, color: "var(--accent)" }}>{code}</div>
        <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 8 }}>Share this code with friends</div>
      </div>

      <div className="fade-up" style={{ width: "100%", maxWidth: 320, marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
          Players ({room?.players?.length || 0}/6)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {room?.players?.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: "var(--card)", borderRadius: 12, border: "2px solid var(--border)"
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: i === 0 ? "var(--accent)" : "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff", fontWeight: 800
              }}>{i === 0 ? "👑" : `P${i + 1}`}</div>
              <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{p.name}</span>
              {p.name === name && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>YOU</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost ? (
          <button className="btn btn-primary" onClick={startGame}
            style={{ opacity: (room?.players?.length || 0) < 2 ? 0.4 : 1 }}
            disabled={(room?.players?.length || 0) < 2}>
            {(room?.players?.length || 0) < 2 ? "Waiting for players..." : "Start Game"}
          </button>
        ) : (
          <div style={{ textAlign: "center", color: "var(--sub)", fontSize: 14, padding: 16, animation: "pulse 2s infinite" }}>
            Waiting for host to start...
          </div>
        )}
        <button className="btn btn-secondary" onClick={leave}>Leave</button>
      </div>
    </div>
  );
}

function ChainGame({ code, playerName, onBack }) {
  const [room, setRoomState] = useState(null);
  const [input, setInput] = useState("");
  const [localTime, setLocalTime] = useState(TURN_TIME);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const lastTurnStartRef = useRef(0);
  const eliminatingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const r = await getRoom(code);
      if (!active) return;
      if (r) {
        setRoomState(r);
        if (r.turnStart !== lastTurnStartRef.current) {
          lastTurnStartRef.current = r.turnStart;
          eliminatingRef.current = false;
          const elapsed = (Date.now() - r.turnStart) / 1000;
          setLocalTime(Math.max(0, Math.ceil(TURN_TIME - elapsed)));
        }
      }
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { active = false; clearTimeout(pollRef.current); };
  }, [code]);

  const nextAlive = (r, from) => {
    let next = (from + 1) % r.players.length;
    let tries = 0;
    while (!r.players[next].alive && tries < r.players.length) { next = (next + 1) % r.players.length; tries++; }
    return next;
  };

  const handleTimeout = async () => {
    if (eliminatingRef.current) return;
    eliminatingRef.current = true;
    const r = await getRoom(code);
    if (!r || r.phase !== "playing") return;
    const elapsed = (Date.now() - r.turnStart) / 1000;
    if (elapsed < TURN_TIME - 1) { eliminatingRef.current = false; return; }
    r.players[r.currentIdx].alive = false;
    r.message = `${r.players[r.currentIdx].name} — Time's up!`;
    const alive = r.players.filter(p => p.alive);
    if (alive.length <= 1) {
      r.phase = "gameover";
    } else {
      r.currentIdx = nextAlive(r, r.currentIdx);
      r.turnStart = Date.now();
    }
    r.lastUpdate = Date.now();
    await setRoom(code, r);
  };

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!room || room.phase !== "playing") return;
    const isHost = room.players[0]?.name === playerName;
    timerRef.current = setInterval(() => {
      if (!room?.turnStart) return;
      const elapsed = (Date.now() - room.turnStart) / 1000;
      const remaining = Math.max(0, Math.ceil(TURN_TIME - elapsed));
      setLocalTime(remaining);
      if (remaining <= 0 && isHost) {
        clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [room?.turnStart, room?.phase, room?.currentIdx]);

  const myIdx = room?.players?.findIndex(p => p.name === playerName) ?? -1;
  const isMyTurn = room?.phase === "playing" && room?.currentIdx === myIdx && room?.players?.[myIdx]?.alive;
  const currentPlayer = room?.players?.[room?.currentIdx];
  const lastWord = room?.chain?.length > 0 ? room.chain[room.chain.length - 1].word : null;
  const requiredLetter = lastWord ? lastWord[lastWord.length - 1].toLowerCase() : null;

  useEffect(() => {
    if (isMyTurn && inputRef.current) inputRef.current.focus();
  }, [isMyTurn]);

  const submitWord = async () => {
    if (!isMyTurn) return;
    const word = input.trim().toLowerCase();
    if (word.length < 2) return;
    if (requiredLetter && word[0] !== requiredLetter) {
      setShaking(true); setTimeout(() => setShaking(false), 500);
      return;
    }

    const r = await getRoom(code);
    if (!r || r.phase !== "playing" || r.currentIdx !== myIdx) return;

    if (r.usedWords.includes(word)) {
      r.players[myIdx].alive = false;
      r.message = `${playerName} — "${word}" already used!`;
      const alive = r.players.filter(p => p.alive);
      if (alive.length <= 1) { r.phase = "gameover"; }
      else { r.currentIdx = nextAlive(r, myIdx); r.turnStart = Date.now(); }
    } else {
      r.players[myIdx].score += word.length;
      r.chain.push({ word, player: playerName });
      r.usedWords.push(word);
      r.message = "";
      r.currentIdx = nextAlive(r, myIdx);
      r.turnStart = Date.now();
    }
    r.lastUpdate = Date.now();
    await setRoom(code, r);
    setInput("");
  };

  if (room?.phase === "gameover") {
    const winner = room.players.find(p => p.alive);
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-up" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>👑</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)" }}>{winner?.name || "Draw"}</h2>
          <div style={{ color: "var(--sub)", fontSize: 13, marginTop: 4 }}>{(room.chain?.length || 1) - 1} words chained</div>
        </div>
        <div className="fade-up" style={{ margin: "28px 0", width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
              background: p.alive ? "var(--card)" : "transparent", opacity: p.alive ? 1 : 0.4,
              border: `2px solid ${p.alive ? "var(--accent)" : "transparent"}`
            }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: "var(--sub)", width: 28 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 700, textDecoration: p.alive ? "none" : "line-through" }}>{p.name}</span>
              <span style={{ fontWeight: 800, color: "var(--accent)" }}>{p.score}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ maxWidth: 300 }} onClick={onBack}>Back to Menu</button>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--sub)", animation: "pulse 1.5s infinite" }}>Connecting...</div>
      </div>
    );
  }

  const timerPct = (localTime / TURN_TIME) * 100;
  const timerColor = localTime <= 2 ? "var(--red)" : localTime <= 4 ? "var(--accent2)" : "var(--green)";
  const meAlive = room.players[myIdx]?.alive;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 13 }}>✕</button>
        <span style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase" }}>Room {code}</span>
        <span style={{ fontSize: 12, color: "var(--sub)" }}>🔗 {(room.chain?.length || 1) - 1}</span>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", flexShrink: 0 }}>
        {room.players.map((p, i) => (
          <div key={i} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            background: i === room.currentIdx && p.alive ? "var(--accent)" : "var(--card)",
            color: i === room.currentIdx && p.alive ? "#fff" : p.alive ? "var(--text)" : "var(--sub)",
            opacity: p.alive ? 1 : 0.3, textDecoration: p.alive ? "none" : "line-through",
            border: `2px solid ${i === room.currentIdx && p.alive ? "var(--accent)" : "var(--border)"}`,
            transition: "all 0.3s"
          }}>
            {p.name}{p.name === playerName ? " •" : ""} <span style={{ opacity: 0.6 }}>{p.score}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 4, background: "var(--border)", margin: "0 16px", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.3s linear, background 0.3s" }} />
      </div>

      <div style={{ textAlign: "center", padding: "12px 16px 4px", fontSize: 13, color: isMyTurn ? "var(--accent)" : "var(--sub)", fontWeight: 700 }}>
        {isMyTurn ? "YOUR TURN!" : `${currentPlayer?.name}'s turn...`}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 140px", display: "flex", flexDirection: "column", gap: 4 }}>
        {room.chain?.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", animation: i === room.chain.length - 1 ? "fadeUp 0.25s ease" : "none" }}>
            <span style={{ color: "var(--sub)", fontSize: 10, width: 56, textAlign: "right", flexShrink: 0 }}>{c.player}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: i === room.chain.length - 1 ? "var(--accent)" : "var(--text)" }}>
              {i > 0 && <span style={{ color: "var(--accent)" }}>{c.word[0]}</span>}
              {i > 0 ? c.word.slice(1) : c.word}
            </span>
          </div>
        ))}
        {room.message && (
          <div style={{ textAlign: "center", color: "var(--red)", fontWeight: 700, fontSize: 13, padding: 10 }}>{room.message}</div>
        )}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px 28px",
        background: "var(--bg)", borderTop: "1px solid var(--border)",
        display: "flex", gap: 10, alignItems: "center"
      }}>
        {meAlive && isMyTurn ? (
          <>
            {requiredLetter && (
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "var(--accent)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20,
                flexShrink: 0, textTransform: "uppercase"
              }}>{requiredLetter}</div>
            )}
            <input
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, ""))}
              onKeyDown={e => e.key === "Enter" && submitWord()}
              placeholder="Type a word..."
              className="input"
              style={{
                flex: 1, fontSize: 20, fontWeight: 700, textTransform: "lowercase", padding: "12px 14px",
                animation: shaking ? "shake 0.4s" : "none"
              }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            />
            <button onClick={submitWord} style={{
              width: 44, height: 44, borderRadius: 12, background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 20, fontWeight: 900, cursor: "pointer", flexShrink: 0
            }}>→</button>
          </>
        ) : (
          <div style={{ flex: 1, textAlign: "center", color: "var(--sub)", fontSize: 14, padding: 12 }}>
            {meAlive ? "Wait for your turn..." : "You've been eliminated 💀"}
          </div>
        )}
        <div style={{ fontWeight: 900, fontSize: 22, color: timerColor, width: 30, textAlign: "center", flexShrink: 0 }}>{localTime}</div>
      </div>
    </div>
  );
}
