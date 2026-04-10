import { useState, useEffect, useRef } from "react";

// ─── Shared infra ───

const POLL_MS = 600;

async function getRoom(code) {
  try {
    const r = await fetch(`/api/room/${code.toUpperCase()}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data;
  } catch { return null; }
}

async function setRoom(code, data) {
  try {
    await fetch(`/api/room/${code.toUpperCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) { console.error("Storage error", e); }
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ─── Game configs ───

const GAMES = {
  chain: { name: "Word Chain Duel", icon: "⛓️", desc: "Last letter → first letter. Miss the timer, you're out!", color: "#ff6347", min: 2, max: 6 },
  bluff: { name: "Bluff the Definition", icon: "🎭", desc: "Write fake definitions. Fool your friends. Spot the truth.", color: "#a855f7", min: 3, max: 8 },
};

// ─── Word Chain data ───

const STARTER_WORDS = [
  "apple","bridge","castle","dragon","eagle","flame","ghost","harvest",
  "island","jungle","knight","lemon","marble","needle","ocean","planet",
  "quartz","river","storm","tower","urban","violet","whale","yellow","zephyr"
];

// ─── Bluff data ───

const OBSCURE_WORDS = [
  { word: "snickersnee", def: "a large knife" },
  { word: "borborygmus", def: "a rumbling sound in the stomach" },
  { word: "callipygian", def: "having well-shaped buttocks" },
  { word: "defenestration", def: "the act of throwing someone out of a window" },
  { word: "floccinaucinihilipilification", def: "the habit of estimating something as worthless" },
  { word: "kerfuffle", def: "a commotion or fuss" },
  { word: "lollygag", def: "to spend time aimlessly" },
  { word: "mumpsimus", def: "a stubborn person who refuses to correct a mistake" },
  { word: "nudiustertian", def: "relating to the day before yesterday" },
  { word: "petrichor", def: "the smell of earth after rain" },
  { word: "quire", def: "twenty-four sheets of paper" },
  { word: "snollygoster", def: "a shrewd unprincipled person" },
  { word: "taradiddle", def: "a petty lie or pretentious nonsense" },
  { word: "ululation", def: "a howling or wailing sound" },
  { word: "widdershins", def: "in a direction contrary to the sun's course" },
  { word: "xertz", def: "to gulp down quickly and greedily" },
  { word: "yarborough", def: "a hand of cards with no card above nine" },
  { word: "zugzwang", def: "a situation where any move will worsen your position" },
  { word: "absquatulate", def: "to leave abruptly" },
  { word: "bumbershoot", def: "an umbrella" },
  { word: "cachinnate", def: "to laugh loudly" },
  { word: "diphthong", def: "a sound formed by combining two vowels in a single syllable" },
  { word: "embrangle", def: "to confuse or entangle" },
  { word: "fipple", def: "the mouthpiece of a recorder or similar instrument" },
  { word: "gardyloo", def: "a warning cry before emptying slop from a window" },
  { word: "hornswoggle", def: "to cheat or swindle" },
  { word: "impignorate", def: "to pawn or mortgage something" },
  { word: "jentacular", def: "relating to breakfast" },
  { word: "kibitzer", def: "a person who offers unwanted advice" },
  { word: "limerence", def: "the state of being infatuated with another person" },
];

// ─── App Router ───

export default function App() {
  const [screen, setScreen] = useState("hub");
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameType, setGameType] = useState("chain");

  const goHub = () => setScreen("hub");

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        :root {
          --bg: #0b0b10; --card: #161620; --border: #252535; --text: #ebebf0;
          --sub: #65657a; --accent: #ff6347; --accent2: #ffa04c; --green: #4ade80; --red: #ff4060;
          --input-bg: #1c1c28; --purple: #a855f7;
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f6f2ed; --card: #fff; --border: #e4dfd8; --text: #18181f;
            --sub: #8a857e; --accent: #e85535; --accent2: #e08830; --green: #22a85a; --red: #d63050;
            --input-bg: #fff; --purple: #9333ea;
          }
        }
        * { box-sizing: border-box; margin: 0; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: var(--sub); }
        input, button, textarea { font-family: inherit; }
        textarea::placeholder { color: var(--sub); }
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

      {screen === "hub" && (
        <Hub onGo={(s, code, name, game) => {
          setScreen(s); setRoomCode(code); setPlayerName(name); setGameType(game || "chain");
        }} />
      )}
      {screen === "lobby" && (
        <LobbyScreen code={roomCode} name={playerName} gameType={gameType}
          onStart={(g) => setScreen(`play_${g}`)} onBack={goHub} />
      )}
      {screen === "play_chain" && <ChainGame code={roomCode} playerName={playerName} onBack={goHub} />}
      {screen === "play_bluff" && <BluffGame code={roomCode} playerName={playerName} onBack={goHub} />}
    </div>
  );
}

// ─── Hub ───

function Hub({ onGo }) {
  const [mode, setMode] = useState(null); // null | pick_game | join
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const create = async (gameId) => {
    if (!name.trim()) return;
    const code = genCode();
    const g = GAMES[gameId];
    const room = {
      code, game: gameId, phase: "lobby",
      players: [{ id: Date.now().toString(36), name: name.trim(), alive: true, score: 0 }],
      host: 0, lastUpdate: Date.now(),
      // chain-specific
      chain: [], usedWords: [], currentIdx: 0, turnStart: 0, message: "",
      // bluff-specific
      round: 0, totalRounds: 5, bluffPhase: "idle", currentWord: null, realDef: null,
      definitions: [], votes: [], usedWordIdxs: [], roundScores: [],
    };
    await setRoom(code, room);
    onGo("lobby", code, name.trim(), gameId);
  };

  const join = async () => {
    if (!name.trim() || joinCode.length < 4) return;
    const room = await getRoom(joinCode.toUpperCase());
    if (!room) { setError("Room not found"); return; }
    if (room.phase !== "lobby") { setError("Game already started"); return; }
    const g = GAMES[room.game];
    if (room.players.length >= (g?.max || 6)) { setError("Room is full"); return; }
    if (room.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) { setError("Name taken"); return; }
    room.players.push({ id: Date.now().toString(36), name: name.trim(), alive: true, score: 0 });
    room.lastUpdate = Date.now();
    await setRoom(joinCode.toUpperCase(), room);
    onGo("lobby", joinCode.toUpperCase(), name.trim(), room.game);
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
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={12} />
          <button className="btn btn-primary" onClick={() => name.trim() ? setMode("pick_game") : null}
            style={{ opacity: name.trim() ? 1 : 0.4 }}>Create Room</button>
          <button className="btn btn-secondary" onClick={() => name.trim() ? setMode("join") : null}
            style={{ opacity: name.trim() ? 1 : 0.4 }}>Join Room</button>
        </div>
      )}

      {mode === "pick_game" && (
        <div className="fade-up" style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>Pick a game</div>
          {Object.entries(GAMES).map(([id, g]) => (
            <button key={id} onClick={() => create(id)} style={{
              background: "var(--card)", border: `2px solid var(--border)`, borderRadius: 14, padding: "18px 20px",
              cursor: "pointer", textAlign: "left", transition: "all 0.2s", width: "100%", display: "flex", gap: 14, alignItems: "center"
            }}>
              <div style={{ fontSize: 28 }}>{g.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: g.color }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3, lineHeight: 1.4 }}>{g.desc}</div>
              </div>
            </button>
          ))}
          <button className="btn btn-secondary" onClick={() => setMode(null)}>Back</button>
        </div>
      )}

      {mode === "join" && (
        <div className="fade-up" style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 14 }}>
          <input className="input" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="Room code" maxLength={4} autoFocus
            style={{ textAlign: "center", letterSpacing: 8, fontSize: 24, textTransform: "uppercase" }} />
          {error && <div style={{ color: "var(--red)", fontSize: 13, textAlign: "center", fontWeight: 700 }}>{error}</div>}
          <button className="btn btn-primary" onClick={join}>Join</button>
          <button className="btn btn-secondary" onClick={() => { setMode(null); setError(""); }}>Back</button>
        </div>
      )}
    </div>
  );
}

// ─── Lobby ───

function LobbyScreen({ code, name, gameType, onStart, onBack }) {
  const [room, setRoomState] = useState(null);
  const pollRef = useRef(null);
  const isHost = room?.players?.[0]?.name === name;
  const g = GAMES[gameType] || GAMES.chain;

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const r = await getRoom(code);
      if (!active) return;
      if (r) {
        setRoomState(r);
        if (r.phase === "playing") { onStart(r.game); return; }
      }
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { active = false; clearTimeout(pollRef.current); };
  }, [code, name, onStart]);

  const startGame = async () => {
    const r = await getRoom(code);
    if (!r || r.players.length < (g.min || 2)) return;

    if (r.game === "chain") {
      const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
      r.phase = "playing";
      r.chain = [{ word: starter, player: "🎲" }];
      r.usedWords = [starter.toLowerCase()];
      r.currentIdx = 0;
      r.turnStart = Date.now();
      r.message = "";
    } else if (r.game === "bluff") {
      r.phase = "playing";
      r.round = 0;
      r.bluffPhase = "writing";
      r.definitions = [];
      r.votes = [];
      r.roundScores = [];
      r.players = r.players.map(p => ({ ...p, score: 0 }));
      // Pick first word
      const idx = Math.floor(Math.random() * OBSCURE_WORDS.length);
      r.currentWord = OBSCURE_WORDS[idx].word;
      r.realDef = OBSCURE_WORDS[idx].def;
      r.usedWordIdxs = [idx];
      r.phaseEnd = Date.now() + 30000;
    }
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
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>{g.icon}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: g.color, textTransform: "uppercase", letterSpacing: 2 }}>{g.name}</div>
      </div>
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "var(--sub)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>Room Code</div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 12, color: g.color }}>{code}</div>
        <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 8 }}>Share this code with friends</div>
      </div>

      <div className="fade-up" style={{ width: "100%", maxWidth: 320, marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
          Players ({room?.players?.length || 0}/{g.max})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {room?.players?.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: "var(--card)", borderRadius: 12, border: "2px solid var(--border)"
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: i === 0 ? g.color : "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff", fontWeight: 800
              }}>{i === 0 ? "👑" : `P${i + 1}`}</div>
              <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{p.name}</span>
              {p.name === name && <span style={{ fontSize: 11, color: g.color, fontWeight: 700 }}>YOU</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
        {isHost ? (
          <button className="btn" onClick={startGame}
            style={{ background: g.color, color: "#fff", opacity: (room?.players?.length || 0) < (g.min || 2) ? 0.4 : 1 }}
            disabled={(room?.players?.length || 0) < (g.min || 2)}>
            {(room?.players?.length || 0) < (g.min || 2) ? `Need ${g.min}+ players` : "Start Game"}
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

// ════════════════════════════════════════
// GAME 1: WORD CHAIN DUEL
// ════════════════════════════════════════

const CHAIN_TURN_TIME = 10;

function ChainGame({ code, playerName, onBack }) {
  const [room, setRoomState] = useState(null);
  const [input, setInput] = useState("");
  const [localTime, setLocalTime] = useState(CHAIN_TURN_TIME);
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
          setLocalTime(Math.max(0, Math.ceil(CHAIN_TURN_TIME - elapsed)));
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
    if (elapsed < CHAIN_TURN_TIME - 1) { eliminatingRef.current = false; return; }
    r.players[r.currentIdx].alive = false;
    r.message = `${r.players[r.currentIdx].name} — Time's up!`;
    const alive = r.players.filter(p => p.alive);
    if (alive.length <= 1) { r.phase = "gameover"; }
    else { r.currentIdx = nextAlive(r, r.currentIdx); r.turnStart = Date.now(); }
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
      const remaining = Math.max(0, Math.ceil(CHAIN_TURN_TIME - elapsed));
      setLocalTime(remaining);
      if (remaining <= 0 && isHost) { clearInterval(timerRef.current); handleTimeout(); }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [room?.turnStart, room?.phase, room?.currentIdx]);

  const myIdx = room?.players?.findIndex(p => p.name === playerName) ?? -1;
  const isMyTurn = room?.phase === "playing" && room?.currentIdx === myIdx && room?.players?.[myIdx]?.alive;
  const currentPlayer = room?.players?.[room?.currentIdx];
  const lastWord = room?.chain?.length > 0 ? room.chain[room.chain.length - 1].word : null;
  const requiredLetter = lastWord ? lastWord[lastWord.length - 1].toLowerCase() : null;

  useEffect(() => { if (isMyTurn && inputRef.current) inputRef.current.focus(); }, [isMyTurn]);

  const [validating, setValidating] = useState(false);
  const [wordError, setWordError] = useState("");

  const submitWord = async () => {
    if (!isMyTurn || validating) return;
    const word = input.trim().toLowerCase();
    if (word.length < 2) return;
    if (requiredLetter && word[0] !== requiredLetter) { setShaking(true); setTimeout(() => setShaking(false), 500); return; }

    setValidating(true);
    setWordError("");
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) {
        setWordError(`"${word}" not in dictionary`);
        setShaking(true); setTimeout(() => setShaking(false), 500);
        setValidating(false);
        return;
      }
    } catch {
      setWordError("Dictionary check failed — try again");
      setValidating(false);
      return;
    }
    setValidating(false);


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

  if (!room) return <Loading />;

  const timerPct = (localTime / CHAIN_TURN_TIME) * 100;
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
            border: `2px solid ${i === room.currentIdx && p.alive ? "var(--accent)" : "var(--border)"}`, transition: "all 0.3s"
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
        {room.message && <div style={{ textAlign: "center", color: "var(--red)", fontWeight: 700, fontSize: 13, padding: 10 }}>{room.message}</div>}
      </div>

      {(wordError || validating) && (
        <div style={{
          position: "fixed", bottom: 88, left: 16, right: 16, textAlign: "center",
          fontSize: 13, fontWeight: 700, color: validating ? "var(--sub)" : "var(--red)",
          background: "var(--card)", border: "2px solid var(--border)", borderRadius: 10,
          padding: "8px 14px", animation: "fadeUp 0.2s ease"
        }}>
          {validating ? "Checking dictionary..." : wordError}
        </div>
      )}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px 28px",
        background: "var(--bg)", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center"
      }}>
        {meAlive && isMyTurn ? (
          <>
            {requiredLetter && (
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "var(--accent)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, flexShrink: 0, textTransform: "uppercase"
              }}>{requiredLetter}</div>
            )}
            <input ref={inputRef} value={input}
              onChange={e => { setInput(e.target.value.replace(/[^a-zA-Z]/g, "")); setWordError(""); }}
              onKeyDown={e => e.key === "Enter" && submitWord()} placeholder="Type a word..." className="input"
              disabled={validating}
              style={{ flex: 1, fontSize: 20, fontWeight: 700, textTransform: "lowercase", padding: "12px 14px", animation: shaking ? "shake 0.4s" : "none", opacity: validating ? 0.5 : 1 }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
            <button onClick={submitWord} disabled={validating} style={{
              width: 44, height: 44, borderRadius: 12, background: "var(--accent)", border: "none",
              color: "#fff", fontSize: 20, fontWeight: 900, cursor: validating ? "default" : "pointer",
              flexShrink: 0, opacity: validating ? 0.5 : 1
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

// ════════════════════════════════════════
// GAME 2: BLUFF THE DEFINITION
// ════════════════════════════════════════

const WRITE_TIME = 30;
const VOTE_TIME = 20;
const REVEAL_TIME = 6;

function BluffGame({ code, playerName, onBack }) {
  const [room, setRoomState] = useState(null);
  const [myDef, setMyDef] = useState("");
  const [myVote, setMyVote] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const lastPhaseRef = useRef("");
  const advancingRef = useRef(false);

  const isHost = room?.players?.[0]?.name === playerName;

  // Poll
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const r = await getRoom(code);
      if (!active) return;
      if (r) {
        setRoomState(r);
        const phaseKey = `${r.bluffPhase}-${r.round}`;
        if (phaseKey !== lastPhaseRef.current) {
          lastPhaseRef.current = phaseKey;
          advancingRef.current = false;
          setSubmitted(false);
          setMyDef("");
          setMyVote(null);
          const remaining = Math.max(0, Math.ceil((r.phaseEnd - Date.now()) / 1000));
          setLocalTime(remaining);
        }
      }
      pollRef.current = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { active = false; clearTimeout(pollRef.current); };
  }, [code]);

  // Local countdown + host auto-advance
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!room || room.phase !== "playing") return;
    timerRef.current = setInterval(() => {
      if (!room.phaseEnd) return;
      const remaining = Math.max(0, Math.ceil((room.phaseEnd - Date.now()) / 1000));
      setLocalTime(remaining);
      if (remaining <= 0 && isHost && !advancingRef.current) {
        advancingRef.current = true;
        clearInterval(timerRef.current);
        advanceBluffPhase();
      }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [room?.phaseEnd, room?.bluffPhase, room?.round, room?.phase]);

  const advanceBluffPhase = async () => {
    const r = await getRoom(code);
    if (!r || r.phase !== "playing") return;

    if (r.bluffPhase === "writing") {
      // Move to voting — shuffle definitions
      const allDefs = [...r.definitions];
      // Add real definition
      allDefs.push({ player: "__REAL__", text: r.realDef });
      // Shuffle
      for (let i = allDefs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allDefs[i], allDefs[j]] = [allDefs[j], allDefs[i]];
      }
      r.shuffledDefs = allDefs;
      r.bluffPhase = "voting";
      r.votes = [];
      r.phaseEnd = Date.now() + VOTE_TIME * 1000;
    } else if (r.bluffPhase === "voting") {
      // Score the round
      const roundScores = {};
      r.players.forEach(p => { roundScores[p.name] = 0; });
      (r.votes || []).forEach(v => {
        const chosen = r.shuffledDefs[v.choiceIdx];
        if (!chosen) return;
        if (chosen.player === "__REAL__") {
          roundScores[v.voter] = (roundScores[v.voter] || 0) + 3;
        } else if (chosen.player !== v.voter) {
          roundScores[chosen.player] = (roundScores[chosen.player] || 0) + 1;
        }
      });
      r.players = r.players.map(p => ({ ...p, score: p.score + (roundScores[p.name] || 0) }));
      r.roundScores = roundScores;
      r.bluffPhase = "reveal";
      r.phaseEnd = Date.now() + REVEAL_TIME * 1000;
    } else if (r.bluffPhase === "reveal") {
      // Next round or game over
      const nextRound = r.round + 1;
      if (nextRound >= r.totalRounds) {
        r.phase = "gameover";
      } else {
        r.round = nextRound;
        r.bluffPhase = "writing";
        r.definitions = [];
        r.votes = [];
        r.shuffledDefs = [];
        r.roundScores = {};
        // Pick new word
        let idx;
        do { idx = Math.floor(Math.random() * OBSCURE_WORDS.length); } while (r.usedWordIdxs.includes(idx));
        r.usedWordIdxs.push(idx);
        r.currentWord = OBSCURE_WORDS[idx].word;
        r.realDef = OBSCURE_WORDS[idx].def;
        r.phaseEnd = Date.now() + WRITE_TIME * 1000;
      }
    }
    r.lastUpdate = Date.now();
    await setRoom(code, r);
  };

  const submitDefinition = async () => {
    if (!myDef.trim() || submitted) return;
    const r = await getRoom(code);
    if (!r || r.bluffPhase !== "writing") return;
    if (r.definitions.some(d => d.player === playerName)) return;
    r.definitions.push({ player: playerName, text: myDef.trim() });
    r.lastUpdate = Date.now();
    await setRoom(code, r);
    setSubmitted(true);
  };

  const submitVote = async (idx) => {
    if (submitted) return;
    const r = await getRoom(code);
    if (!r || r.bluffPhase !== "voting") return;
    // Can't vote for own definition
    if (r.shuffledDefs[idx]?.player === playerName) return;
    if (r.votes.some(v => v.voter === playerName)) return;
    r.votes.push({ voter: playerName, choiceIdx: idx });
    r.lastUpdate = Date.now();
    await setRoom(code, r);
    setMyVote(idx);
    setSubmitted(true);
  };

  // Game Over
  if (room?.phase === "gameover" && room?.game === "bluff") {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-up" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎭</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--purple)" }}>{sorted[0]?.name} Wins!</h2>
          <div style={{ color: "var(--sub)", fontSize: 13, marginTop: 4 }}>{room.totalRounds} rounds of deception</div>
        </div>
        <div className="fade-up" style={{ margin: "28px 0", width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
              background: i === 0 ? "var(--card)" : "transparent",
              border: `2px solid ${i === 0 ? "var(--purple)" : "transparent"}`
            }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: "var(--sub)", width: 28 }}>#{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
              <span style={{ fontWeight: 800, color: "var(--purple)" }}>{p.score}</span>
            </div>
          ))}
        </div>
        <button className="btn" style={{ maxWidth: 300, background: "var(--purple)", color: "#fff" }} onClick={onBack}>Back to Menu</button>
      </div>
    );
  }

  if (!room) return <Loading />;

  const totalTime = room.bluffPhase === "writing" ? WRITE_TIME : room.bluffPhase === "voting" ? VOTE_TIME : REVEAL_TIME;
  const timerPct = (localTime / totalTime) * 100;
  const timerColor = localTime <= 5 ? "var(--red)" : localTime <= 10 ? "var(--accent2)" : "var(--purple)";
  const alreadySubmittedDef = room.definitions?.some(d => d.player === playerName);
  const alreadyVoted = room.votes?.some(v => v.voter === playerName);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 13 }}>✕</button>
        <span style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase" }}>
          Round {room.round + 1}/{room.totalRounds}
        </span>
        <span style={{ fontSize: 12, color: "var(--sub)" }}>{code}</span>
      </div>

      {/* Timer bar */}
      <div style={{ height: 4, background: "var(--border)", margin: "0 16px", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.3s linear" }} />
      </div>

      {/* Scores strip */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", flexShrink: 0 }}>
        {room.players.map((p, i) => (
          <div key={i} style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            background: "var(--card)", color: "var(--text)", border: "2px solid var(--border)"
          }}>
            {p.name}{p.name === playerName ? " •" : ""} <span style={{ color: "var(--purple)" }}>{p.score}</span>
          </div>
        ))}
      </div>

      {/* Word display */}
      <div style={{ textAlign: "center", padding: "20px 24px 12px" }}>
        <div style={{ fontSize: 11, color: "var(--sub)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>The word is</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--purple)", letterSpacing: -1 }}>{room.currentWord}</div>
      </div>

      {/* Phase content */}
      <div style={{ flex: 1, padding: "12px 20px 32px", overflowY: "auto" }}>

        {/* WRITING PHASE */}
        {room.bluffPhase === "writing" && (
          <div className="fade-up" style={{ maxWidth: 400, margin: "0 auto" }}>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--sub)", marginBottom: 16 }}>
              Write a fake definition. Be convincing!
            </div>
            {alreadySubmittedDef || submitted ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ color: "var(--sub)", fontSize: 14 }}>Definition submitted! Waiting for others...</div>
                <div style={{ color: "var(--sub)", fontSize: 12, marginTop: 8 }}>
                  {room.definitions?.length}/{room.players.length} submitted
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={myDef} onChange={e => setMyDef(e.target.value)} placeholder="Enter your fake definition..."
                  maxLength={200}
                  style={{
                    width: "100%", minHeight: 100, padding: 14, borderRadius: 12, border: "2px solid var(--border)",
                    background: "var(--input-bg)", color: "var(--text)", fontSize: 16, fontWeight: 600,
                    outline: "none", fontFamily: "inherit", resize: "vertical"
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--purple)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                <button className="btn" onClick={submitDefinition}
                  style={{ background: "var(--purple)", color: "#fff", marginTop: 12, opacity: myDef.trim() ? 1 : 0.4 }}>
                  Submit
                </button>
              </>
            )}
          </div>
        )}

        {/* VOTING PHASE */}
        {room.bluffPhase === "voting" && (
          <div className="fade-up" style={{ maxWidth: 400, margin: "0 auto" }}>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--sub)", marginBottom: 16 }}>
              Which definition is REAL?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {room.shuffledDefs?.map((d, i) => {
                const isOwn = d.player === playerName;
                const voted = alreadyVoted || submitted;
                const isMyChoice = myVote === i;
                return (
                  <button key={i} onClick={() => !isOwn && !voted && submitVote(i)} style={{
                    background: isMyChoice ? "var(--purple)" : "var(--card)",
                    color: isMyChoice ? "#fff" : isOwn ? "var(--sub)" : "var(--text)",
                    border: `2px solid ${isMyChoice ? "var(--purple)" : "var(--border)"}`,
                    borderRadius: 12, padding: "14px 16px", textAlign: "left", fontSize: 14, fontWeight: 600,
                    cursor: isOwn || voted ? "default" : "pointer", opacity: isOwn ? 0.5 : 1,
                    transition: "all 0.2s", lineHeight: 1.5, width: "100%"
                  }}>
                    <span style={{ marginRight: 8, fontWeight: 900, opacity: 0.5 }}>{String.fromCharCode(65 + i)}</span>
                    {d.text}
                    {isOwn && <span style={{ fontSize: 10, marginLeft: 8 }}>(yours)</span>}
                  </button>
                );
              })}
            </div>
            {(alreadyVoted || submitted) && (
              <div style={{ textAlign: "center", color: "var(--sub)", fontSize: 12, marginTop: 16 }}>
                Vote locked! {room.votes?.length}/{room.players.length} voted
              </div>
            )}
          </div>
        )}

        {/* REVEAL PHASE */}
        {room.bluffPhase === "reveal" && (
          <div className="fade-up" style={{ maxWidth: 400, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                The real definition:
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1.5, padding: "12px 16px", background: "var(--card)", borderRadius: 12, border: "2px solid var(--green)" }}>
                {room.realDef}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--sub)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Round scores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {room.players.map((p, i) => {
                const rs = room.roundScores?.[p.name] || 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "var(--card)" }}>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                    <span style={{ fontWeight: 800, color: rs > 0 ? "var(--green)" : "var(--sub)" }}>+{rs}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Timer display */}
      <div style={{ position: "fixed", bottom: 20, right: 20, fontWeight: 900, fontSize: 28, color: timerColor }}>
        {localTime}
      </div>
    </div>
  );
}

// ─── Shared components ───

function Loading() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--sub)", animation: "pulse 1.5s infinite" }}>Connecting...</div>
    </div>
  );
}
