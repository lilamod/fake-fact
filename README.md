# Fake Fact

A real-time bluffing party game for 2–8 players. Create a room, share the 4-character code, invent convincing fake answers, and vote for the truth.

## Run locally

- Node.js 20+
- `npm install`
- `npm start`
- Open `http://localhost:10000`

## Deploy on Render

Create a Node web service for this repository, with build command `npm install`, start command `npm start`, and health check path `/healthz`.

## Game rules

- Five rounds, 30 seconds to submit a bluff, then 20 seconds to vote.
- Correct real-answer vote: +2 points.
- Each player fooled by your bluff: +1 point.
- Players cannot vote for their own bluff.

## Current MVP notes

Room state is held in memory, so a server restart clears active rooms. For production scale, use Redis or a database for durable room state and a shared Socket.IO adapter. Verify the factual prompt bank before public release.
