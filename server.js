const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (_, res) => res.json({ ok: true, name: 'Fake Fact' }));

// Short, checkable facts selected to leave room for plausible bluffs.
const prompts = [
  { q: 'What shape are wombat droppings?', a: 'Cubes' },
  { q: 'Which planet rotates on its side, with an axial tilt of about 98 degrees?', a: 'Uranus' },
  { q: 'What is the only mammal capable of sustained powered flight?', a: 'Bat' },
  { q: 'Which animal has fingerprints that can look remarkably like human fingerprints?', a: 'Koala' },
  { q: 'What is the name of the deepest known point in Earth’s oceans?', a: 'Challenger Deep' },
  { q: 'Which bird has nostrils near the tip of its bill and can smell well at sea?', a: 'Albatross' },
  { q: 'What is the only type of bird known to fly backwards for sustained periods?', a: 'Hummingbird' },
  { q: 'Which animal has blue blood because its oxygen-carrying pigment contains copper?', a: 'Horseshoe crab' },
  { q: 'What is the tiny bone in the middle ear shaped like a stirrup called?', a: 'Stapes' },
  { q: 'Which sea mammal is famous for using rocks to crack open shellfish?', a: 'Sea otter' },
  { q: 'What is the name of the fear of being without a mobile phone?', a: 'Nomophobia' },
  { q: 'Which planet has a day longer than its year?', a: 'Venus' },
  { q: 'What is the collective noun often used for a group of flamingos?', a: 'A flamboyance' },
  { q: 'Which animal can regenerate lost limbs and parts of its heart and brain?', a: 'Axolotl' },
  { q: 'What is the name for a word or phrase that reads the same backwards?', a: 'Palindrome' },
  { q: 'Which mammal lays eggs and has a bill like a duck?', a: 'Platypus' },
  { q: 'Which animal’s tongue can be longer than its own body?', a: 'Chameleon' },
  { q: 'What is the name of the largest desert on Earth by area?', a: 'Antarctic Desert' },
  { q: 'Which bird can rotate its head up to about 270 degrees?', a: 'Owl' },
  { q: 'What is the name of the reflective layer that helps cats see in low light?', a: 'Tapetum lucidum' },
  { q: 'Which insect tastes with receptors on its feet?', a: 'Butterfly' },
  { q: 'What is the only continent that lies in all four hemispheres?', a: 'Africa' },
  { q: 'Which sea creature has a W-shaped pupil?', a: 'Cuttlefish' },
  { q: 'What is the name of the phenomenon where a hot liquid can freeze faster than a colder one under some conditions?', a: 'Mpemba effect' },
  { q: 'Which moon of Saturn has lakes and seas of liquid methane and ethane?', a: 'Titan' },
  { q: 'What is the name of the longest cranial nerve in the human body?', a: 'Vagus nerve' },
  { q: 'Which metal has the chemical symbol W?', a: 'Tungsten' },
  { q: 'What is the name of the line around Earth where the calendar date changes?', a: 'International Date Line' },
  { q: 'What is the name of the ring-shaped pattern of fungi sometimes seen in grass?', a: 'Fairy ring' },
  { q: 'What is the name of the first artificial object to reach interstellar space?', a: 'Voyager 1' },
  { q: 'Which natural material is made by mollusks to line the inside of some shells?', a: 'Nacre' },
  { q: 'What is the name of the process plants use to release water vapour through leaves?', a: 'Transpiration' },
  { q: 'Which planet’s largest moon, Ganymede, is bigger than Mercury?', a: 'Jupiter' },
  { q: 'What is the name of the boundary around a black hole beyond which light cannot escape?', a: 'Event horizon' },
  { q: 'Which animal uses echolocation and can fly in complete darkness?', a: 'Bat' },
  { q: 'What is the name of the layer of the atmosphere where most weather occurs?', a: 'Troposphere' },
  { q: 'Which animal has a heart that can weigh over 400 pounds?', a: 'Blue whale' },
  { q: 'What is the name of the scientific study of fungi?', a: 'Mycology' },
  { q: 'Which tree produces acorns?', a: 'Oak' },
  { q: 'What is the name of the point in an orbit farthest from Earth?', a: 'Apogee' }
];

const rooms = new Map();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const randomId = () => require('crypto').randomBytes(12).toString('hex');
const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
const connectedPlayers = r => [...r.players.values()].filter(p => p.connected);
const shuffle = list => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const cancelTimer = (r, key) => { if (r[key]) clearTimeout(r[key]); r[key] = null; };
function publicRoom(r, viewerId) {
  const players = [...r.players.values()];
  const ownSubmission = r.submissions.find(s => s.playerId === viewerId && !s.pass);
  const ownChoice = r.choices.find(c => c.playerId === viewerId && !c.real);
  const viewer = r.players.get(viewerId);
  const hasVoted = Object.prototype.hasOwnProperty.call(r.votes, viewerId);
  return {
    code: r.code, phase: r.phase, round: r.round, maxRounds: 5,
    hostId: r.players.get(r.hostId)?.publicId || null, myId: viewer?.publicId || null, players: players.map(p => ({ id: p.publicId, name: p.name, score: p.score, connected: p.connected })),
    prompt: r.prompt ? { q: r.prompt.q } : null,
    choices: r.phase === 'vote' ? r.choices.map(c => ({ id: c.id, text: c.text })) : [],
    ownChoiceId: ownChoice ? ownChoice.id : null,
    ownVoteChoiceId: r.votes[viewerId] || null,
    submitted: players.filter(p => r.submissions.some(s => s.playerId === p.id)).map(p => p.name),
    voted: players.filter(p => Object.prototype.hasOwnProperty.call(r.votes, p.id)).map(p => p.name),
    submissionCount: r.submissions.filter(s => !s.pass).length,
    voteCount: Object.keys(r.votes).length,
    ownSubmitted: Boolean(ownSubmission),
    ownVoted: hasVoted,
    deadline: r.deadline || null,
    results: r.phase === 'finished' ? r.results.map(x => ({ id: r.players.get(x.id)?.publicId || null, name: x.name, score: x.score, winner: x.winner })) : null
  };
}
function sendRoom(r) {
  for (const p of r.players.values()) {
    if (p.connected && p.socketId) io.to(p.socketId).emit('room:update', publicRoom(r, p.id));
  }
}
function sendNotice(socket, message) { if (socket && socket.connected) socket.emit('notice', message); }
function scheduleCleanup(r) {
  cancelTimer(r, 'cleanupTimer');
  r.cleanupTimer = setTimeout(() => {
    if (connectedPlayers(r).length === 0 && rooms.get(r.code) === r) {
      cancelTimer(r, 'timer');
      cancelTimer(r, 'advanceTimer');
      rooms.delete(r.code);
    }
  }, 180000);
}
function maybeAdvanceForProgress(r) {
  if (!r || connectedPlayers(r).length === 0) return;
  if (r.phase === 'submit' && connectedPlayers(r).every(p => r.submissions.some(s => s.playerId === p.id))) startVote(r);
  if (r.phase === 'vote' && connectedPlayers(r).every(p => Object.prototype.hasOwnProperty.call(r.votes, p.id))) finishVote(r);
}
function beginRound(r) {
  cancelTimer(r, 'advanceTimer');
  if (r.promptIndex >= r.promptDeck.length) {
    r.phase = 'finished';
    const sorted = [...r.players.values()].sort((a, b) => b.score - a.score);
    const high = sorted.length ? sorted[0].score : 0;
    r.results = sorted.map(p => ({ id: p.id, name: p.name, score: p.score, winner: p.score === high }));
    sendRoom(r);
    return;
  }
  r.round++;
  r.prompt = r.promptDeck[r.promptIndex++];
  r.phase = 'submit';
  r.submissions = [];
  r.choices = [];
  r.votes = {};
  r.roundPoints = {};
  r.results = null;
  r.deadline = Date.now() + 30000;
  cancelTimer(r, 'timer');
  r.timer = setTimeout(() => startVote(r), 30000);
  io.to(r.code).emit('round:prompt', { q: r.prompt.q, round: r.round, total: 5, seconds: 30, deadline: r.deadline });
  sendRoom(r);
}
function startVote(r) {
  if (!r || r.phase !== 'submit') return;
  cancelTimer(r, 'timer');
  for (const p of connectedPlayers(r)) {
    if (!r.submissions.some(s => s.playerId === p.id)) r.submissions.push({ id: randomId(), text: '(passed)', playerId: p.id, pass: true });
  }
  r.choices = shuffle([
    ...r.submissions.filter(s => !s.pass).map(s => ({ id: randomId(), text: s.text, playerId: s.playerId, real: false })),
    { id: randomId(), text: r.prompt.a, playerId: null, real: true }
  ]);
  r.phase = 'vote';
  r.deadline = Date.now() + 20000;
  r.timer = setTimeout(() => finishVote(r), 20000);
  io.to(r.code).emit('vote:start', { seconds: 20, deadline: r.deadline });
  sendRoom(r);
}
function finishVote(r) {
  if (!r || r.phase !== 'vote') return;
  cancelTimer(r, 'timer');
  const points = {};
  for (const [voterId, choiceId] of Object.entries(r.votes)) {
    const choice = r.choices.find(c => c.id === choiceId);
    if (!choice) continue;
    if (choice.real) {
      const voter = r.players.get(voterId);
      if (voter) { voter.score += 2; points[voterId] = (points[voterId] || 0) + 2; }
    } else if (choice.playerId && choice.playerId !== voterId) {
      const author = r.players.get(choice.playerId);
      if (author) { author.score += 1; points[author.id] = (points[author.id] || 0) + 1; }
    }
  }
  r.roundPoints = points;
  r.phase = 'reveal';
  r.deadline = null;
  r.results = [...r.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, gained: points[p.id] || 0 }))
    .sort((a, b) => b.score - a.score);
  const revealChoices = r.choices.map(c => ({
    id: c.id, text: c.text, real: c.real,
    author: c.playerId ? (r.players.get(c.playerId)?.name || 'Disconnected player') : null,
    voters: Object.entries(r.votes).filter(([, id]) => id === c.id).map(([id]) => r.players.get(id)?.name || 'Disconnected player')
  }));
  const revealVotes = Object.fromEntries(Object.entries(r.votes).map(([id, choiceId]) => [r.players.get(id)?.name || 'Disconnected player', choiceId]));
  const publicResults = r.results.map(x => ({ id: r.players.get(x.id)?.publicId || null, name: x.name, score: x.score, gained: x.gained }));
  io.to(r.code).emit('round:reveal', { answer: r.prompt.a, choices: revealChoices, votes: revealVotes, results: publicResults, round: r.round });
  sendRoom(r);
  cancelTimer(r, 'advanceTimer');
  r.advanceTimer = setTimeout(() => {
    if (r.phase === 'reveal') beginRound(r);
  }, 20000);
}
function safeHandler(socket, event, handler) {
  socket.on(event, (payload = {}, callback) => {
    const data = payload && typeof payload === 'object' ? payload : {};
    const cb = typeof callback === 'function' ? callback : null;
    try {
      handler(data, cb);
    } catch (error) {
      console.error('Socket handler error [' + event + ']:', error && error.stack ? error.stack : error);
      if (cb) cb({ error: 'Something went wrong. Please try again.' });
      else sendNotice(socket, 'Something went wrong. Please try again.');
    }
  });
}
function respond(cb, result) { if (typeof cb === 'function') cb(result); }
function validToken(value) { return typeof value === 'string' && value.length >= 16 && value.length <= 100; }
function attachPlayer(socket, r, p) {
  p.connected = true;
  p.socketId = socket.id;
  p.lastSeen = Date.now();
  socket.data.room = r.code;
  socket.data.playerId = p.id;
  socket.join(r.code);
}
io.on('connection', socket => {
  safeHandler(socket, 'room:create', ({ name, playerId }, cb) => {
    name = cleanName(name);
    if (!name) return respond(cb, { error: 'Enter a nickname.' });
    if (!validToken(playerId)) return respond(cb, { error: 'Refresh the page and try again.' });
    let c;
    do { c = makeCode(); } while (rooms.has(c));
    const p = { id: playerId, publicId: randomId(), name, score: 0, connected: true, socketId: socket.id, lastSeen: Date.now() };
    const r = { code: c, hostId: p.id, players: new Map([[p.id, p]]), phase: 'lobby', round: 0,
      promptDeck: shuffle(prompts), promptIndex: 0, prompt: null, submissions: [], choices: [], votes: {},
      results: null, roundPoints: {}, deadline: null, timer: null, advanceTimer: null, cleanupTimer: null };
    rooms.set(c, r);
    socket.data.room = c; socket.data.playerId = p.id; socket.join(c);
    respond(cb, { code: c, playerId: p.id });
    sendRoom(r);
  });
  safeHandler(socket, 'room:join', ({ code: roomCode, name, playerId }, cb) => {
    const c = String(roomCode || '').trim().toUpperCase();
    name = cleanName(name);
    if (!name) return respond(cb, { error: 'Enter a nickname.' });
    if (!validToken(playerId)) return respond(cb, { error: 'Refresh the page and try again.' });
    const r = rooms.get(c);
    if (!r) return respond(cb, { error: 'Room not found. Check the code.' });
    if (r.players.size >= 8) return respond(cb, { error: 'This room is full (8 players).' });
    if (r.phase !== 'lobby') return respond(cb, { error: 'This game has already started.' });
    if ([...r.players.values()].some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return respond(cb, { error: 'That nickname is already taken in this room.' });
    if (r.players.has(playerId)) return respond(cb, { error: 'This player token is already in use. Refresh and try again.' });
    const p = { id: playerId, publicId: randomId(), name, score: 0, connected: true, socketId: socket.id, lastSeen: Date.now() };
    r.players.set(p.id, p);
    attachPlayer(socket, r, p);
    cancelTimer(r, 'cleanupTimer');
    respond(cb, { code: c, playerId: p.id });
    sendRoom(r);
  });
  safeHandler(socket, 'room:reconnect', ({ code: roomCode, playerId }, cb) => {
    const c = String(roomCode || '').trim().toUpperCase();
    if (!validToken(playerId)) return respond(cb, { error: 'No saved player session was found.' });
    const r = rooms.get(c);
    if (!r) return respond(cb, { error: 'This room has expired. Create a new room to play again.' });
    const p = r.players.get(playerId);
    if (!p) return respond(cb, { error: 'This player session is not in that room.' });
    if (p.socketId && p.socketId !== socket.id) {
      const previous = io.sockets.sockets.get(p.socketId);
      if (previous) { previous.data.superseded = true; previous.disconnect(true); }
    }
    attachPlayer(socket, r, p);
    cancelTimer(r, 'cleanupTimer');
    respond(cb, { code: c, playerId: p.id, room: publicRoom(r, p.id) });
    sendRoom(r);
  });
  safeHandler(socket, 'game:start', (_data) => {
    const r = rooms.get(socket.data.room);
    if (!r || r.hostId !== socket.data.playerId) return sendNotice(socket, 'Only the host can start.');
    if (connectedPlayers(r).length < 2) return sendNotice(socket, 'You need at least 2 connected players to start.');
    if (r.phase !== 'lobby') return sendNotice(socket, 'This game has already started.');
    beginRound(r);
  });
  safeHandler(socket, 'answer:submit', ({ text }) => {
    const r = rooms.get(socket.data.room);
    if (!r || r.phase !== 'submit') return;
    const p = r.players.get(socket.data.playerId);
    text = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    if (!p || !p.connected || !text) return sendNotice(socket, 'Enter an answer first.');
    if (r.submissions.some(s => s.playerId === p.id)) return sendNotice(socket, 'You already submitted this round.');
    if (text.toLocaleLowerCase() === r.prompt.a.trim().toLocaleLowerCase()) return sendNotice(socket, 'Your bluff cannot be the real answer. Try another answer.');
    if (r.submissions.some(s => !s.pass && s.text.toLocaleLowerCase() === text.toLocaleLowerCase())) return sendNotice(socket, 'Someone already submitted that bluff. Try a different one.');
    r.submissions.push({ id: randomId(), text, playerId: p.id });
    socket.emit('answer:submitted');
    sendRoom(r);
    maybeAdvanceForProgress(r);
  });
  safeHandler(socket, 'vote:submit', ({ choiceId }) => {
    const r = rooms.get(socket.data.room);
    if (!r || r.phase !== 'vote') return;
    const playerId = socket.data.playerId;
    const p = r.players.get(playerId);
    if (!p || !p.connected) return sendNotice(socket, 'Reconnect to vote.');
    const choice = r.choices.find(x => x.id === choiceId);
    if (!choice) return sendNotice(socket, 'That choice is not available.');
    if (choice.playerId === playerId) return sendNotice(socket, 'You cannot vote for your own fake answer.');
    if (Object.prototype.hasOwnProperty.call(r.votes, playerId)) return sendNotice(socket, 'Your vote is already locked in.');
    r.votes[playerId] = choiceId;
    socket.emit('vote:submitted', { choiceId });
    sendRoom(r);
    maybeAdvanceForProgress(r);
  });
  safeHandler(socket, 'game:next', () => {
    const r = rooms.get(socket.data.room);
    if (!r || r.phase !== 'reveal') return;
    if (r.hostId !== socket.data.playerId) return sendNotice(socket, 'Only the host can continue.');
    cancelTimer(r, 'advanceTimer');
    beginRound(r);
  });
  safeHandler(socket, 'game:rematch', () => {
    const r = rooms.get(socket.data.room);
    if (!r || r.hostId !== socket.data.playerId || r.phase !== 'finished') return sendNotice(socket, 'Only the host can start a rematch.');
    if (r.promptIndex >= r.promptDeck.length) return sendNotice(socket, 'This room has used its full prompt deck. Create a new room for fresh questions.');
    cancelTimer(r, 'advanceTimer');
    r.round = 0;
    for (const p of r.players.values()) p.score = 0;
    r.phase = 'lobby'; r.results = null; r.prompt = null; r.deadline = null;
    r.submissions = []; r.choices = []; r.votes = {}; r.roundPoints = {};
    sendRoom(r);
  });
  socket.on('disconnect', () => {
    if (socket.data.superseded) return;
    try {
    const r = rooms.get(socket.data.room);
    if (!r) return;
    const p = r.players.get(socket.data.playerId);
    if (p && p.socketId === socket.id) {
      p.connected = false; p.lastSeen = Date.now(); p.socketId = null;
      if (r.hostId === p.id) {
        const next = connectedPlayers(r)[0];
        if (next) r.hostId = next.id;
      }
      sendRoom(r);
      maybeAdvanceForProgress(r);
      if (connectedPlayers(r).length === 0) scheduleCleanup(r);
    }
    } catch (error) { console.error('Socket disconnect handler error:', error); }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log('Fake Fact listening on ' + PORT));
