"use client";

import { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { db } from '@/lib/firebase';

interface BoardProps {
  room: string;
}

const winConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export default function Board({ room }: BoardProps) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("Player X's Turn");

  // Ensure a unique user ID exists in localStorage
  useEffect(() => {
    let uid = localStorage.getItem('tic_tac_toe_uid');
    if (!uid) {
      uid = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('tic_tac_toe_uid', uid);
    }
  }, []);

  useEffect(() => {
    const gameRef = ref(db, `games/${room}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setBoard(data.board || Array(9).fill(''));
        setGameOver(data.over || false);
        updateStatus(data.board || Array(9).fill(''), data.turn || 'X', data.over || false);

        // Assign player symbol if not set
        const uid = localStorage.getItem('tic_tac_toe_uid');
        if (uid) {
          const players = data.players || {};
          if (players[uid]) {
            setPlayerSymbol(players[uid]);
          } else if (Object.keys(players).length < 2) {
            // choose a symbol not taken
            const assigned = Object.values(players) as string[];
            const symbol = assigned.includes('X') ? 'O' : 'X';
            set(ref(db, `games/${room}/players/${uid}`), symbol);
            setPlayerSymbol(symbol as 'X' | 'O');
          }
        }
      }
    });
    return () => unsubscribe();
  }, [room]);

  const updateStatus = (currentBoard: string[], turn: 'X' | 'O', over: boolean) => {
    if (over) {
      // determine winner (simple approach)
      const winner = winConditions.map(w => {
        const [a, b, c] = w;
        if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) return currentBoard[a];
        return null;
      }).find(Boolean) as string | undefined;
      setStatus(winner ? `${winner} Wins! 🎉` : "It's a Tie! 🤝");
    } else {
      setStatus(`${turn}'s Turn`);
    }
  };

  const makeMove = async (index: number) => {
    if (board[index] !== '' || gameOver || !playerSymbol) return;
    const gameRef = ref(db, `games/${room}`);
    const snapshot = await get(gameRef);
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    // Only allow move if it's this player's turn
    if (data.turn !== playerSymbol) return;
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    const newOver = checkWinner(newBoard);
    const newTurn = playerSymbol === 'X' ? 'O' : 'X';
    set(ref(db, `games/${room}`), { ...data, board: newBoard, turn: newTurn, over: newOver });
  };

  const checkWinner = (b: string[]): boolean => {
    for (const win of winConditions) {
      if (b[win[0]] && b[win[0]] === b[win[1]] && b[win[0]] === b[win[2]]) {
        return true;
      }
    }
    return !b.includes('');
  };

  const handleClick = (index: number) => {
    makeMove(index);
  };

  const restartGame = () => {
    set(ref(db, `games/${room}`), { board: Array(9).fill(''), turn: 'X', over: false, players: {} });
    setBoard(Array(9).fill(''));
    setPlayerSymbol(null);
    setGameOver(false);
    setStatus("Player X's Turn");
    // Remove player assignment for restart
    const uid = localStorage.getItem('tic_tac_toe_uid');
    if (uid) {
      set(ref(db, `games/${room}/players/${uid}`), null);
    }
  };

  useEffect(() => {
    // Initialize game if empty
    const gameRef = ref(db, `games/${room}`);
    get(gameRef).then((snapshot) => {
      if (!snapshot.exists()) {
        set(ref(db, `games/${room}`), { board: Array(9).fill(''), turn: 'X', over: false, players: {} });
      }
    });
  }, [room]);

  return (
    <div>
      <div className="status">{status}</div>
      <div className="board">
        {board.map((cell, index) => (
          <div
            key={index}
            className={`cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''}`}
            onClick={() => handleClick(index)}
            style={{ cursor: (!playerSymbol || gameOver) ? 'not-allowed' : 'pointer', opacity: (!playerSymbol || gameOver) ? 0.6 : 1 }}
          >
            {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1em', color: '#888' }}>
        {playerSymbol ? `You are: ${playerSymbol}` : 'Waiting for assignment...'}
      </div>
      {gameOver && <button className="restart" onClick={restartGame}>New Game</button>}
    </div>
  );
}