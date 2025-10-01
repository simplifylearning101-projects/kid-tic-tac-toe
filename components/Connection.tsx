'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Connection() {
  const [roomInput, setRoomInput] = useState('');
  const router = useRouter();

  const generateKey = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createGame = () => {
    const room = generateKey();
    router.push(`/game/${room}`);
  };

  const joinGame = () => {
    const room = roomInput.toUpperCase().trim();
    if (room.length !== 6) {
      alert('Secret key must be 6 characters!');
      return;
    }
    router.push(`/game/${room}`);
  };

  return (
    <div className="connection">
      <h1>🎮 Kid Tic Tac Toe 🎮</h1>
      <button onClick={createGame}>Create Game</button>
      <p>or</p>
      <input
        type="text"
        placeholder="Enter secret key"
        maxLength={6}
        value={roomInput}
        onChange={(e) => setRoomInput(e.target.value)}
      />
      <button onClick={joinGame}>Join Game</button>
    </div>
  );
}