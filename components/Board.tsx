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
  const [status, setStatus] = useState("Waiting for players...");
  const [gameReady, setGameReady] = useState(false);

  // Ensure a unique user ID exists in localStorage
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

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
        const currentBoard = data.board || Array(9).fill('');
        const isOver = data.over || false;
        const currentTurn = data.turn || 'X';
        setBoard(currentBoard);
        setGameOver(isOver);
        
        const players = data.players || {};
        const playerCount = Object.keys(players).length;
        const uid = localStorage.getItem('tic_tac_toe_uid');

        // Update player symbol if needed
        if (uid) {
          if (players[uid]) {
            setPlayerSymbol(players[uid]);
          } else if (playerCount < 2) {
            const assigned = Object.values(players) as ('X' | 'O')[];
            const symbol = assigned.includes('X') ? 'O' : 'X';
            set(ref(db, `games/${room}/players/${uid}`), symbol);
            setPlayerSymbol(symbol);
          }
        }

        // Update game state
        if (isOver) {
          // Check if there's a winner
          const winner = checkWinner(currentBoard);
          if (winner) {
            setStatus(`${winner} Wins! 🎉`);
          } else {
            setStatus("It's a Tie! 🤝");
          }
          setGameReady(false);
          // Show restart button by ensuring gameOver is true
          setGameOver(true);
        } else if (playerCount === 2) {
          setGameReady(true);
          setStatus("Game started! Player X's Turn");
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Game Ready!', { body: 'Second player has joined. Game is starting!' });
          }
        } else if (playerCount < 2) {
          setGameReady(false);
          setStatus(`Waiting for opponent... (${playerCount}/2 players)`);
        } else {
          updateStatus(currentBoard, data.turn || 'X', false);
        }

        // Handle game ready state
        if (playerCount === 2 && !gameReady) {
          setGameReady(true);
          setStatus("Game started! Player X's Turn");
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Game Ready!', { body: 'Second player has joined. Game is starting!' });
          }
        } else if (playerCount < 2) {
          setGameReady(false);
          setStatus(`Waiting for opponent... (${playerCount}/2 players)`);
        } else {
          updateStatus(data.board || Array(9).fill(''), data.turn || 'X', data.over || false);
        }

        // Assign player symbol if not set
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
    if (board[index] !== '' || gameOver || !playerSymbol || !gameReady) return;
    const gameRef = ref(db, `games/${room}`);
    const snapshot = await get(gameRef);
    if (!snapshot.exists()) return;
    const data = snapshot.val();
    // Only allow move if it's this player's turn
    if (data.turn !== playerSymbol) return;
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    
    const winner = checkWinner(newBoard);
    const isTie = !newBoard.includes('') && !winner;
    const newOver = winner !== null || isTie;
    const newTurn = playerSymbol === 'X' ? 'O' : 'X';
    
    await set(ref(db, `games/${room}`), { 
      ...data, 
      board: newBoard, 
      turn: newTurn, 
      over: newOver,
      winner: winner
    });

    // Update local state immediately
    if (newOver) {
      setGameOver(true);
      setGameReady(false);
      if (winner) {
        setStatus(`${winner} Wins! 🎉`);
      } else if (isTie) {
        setStatus("It's a Tie! 🤝");
      }
    }
  };

  const checkWinner = (board: string[]): string | null => {
    // Check for winner
    for (const win of winConditions) {
      const [a, b, c] = win;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]; // Return the winning symbol (X or O)
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    makeMove(index);
  };

  const restartGame = async () => {
    const gameRef = ref(db, `games/${room}`);
    const snapshot = await get(gameRef);
    if (!snapshot.exists()) return;
    
    const existingPlayers = snapshot.val().players || {};
    const existingPlayerCount = Object.keys(existingPlayers).length;

    // Reset game state in Firebase
    await set(ref(db, `games/${room}`), { 
      board: Array(9).fill(''), 
      turn: 'X', 
      over: false, 
      winner: null,
      players: existingPlayers // Keep existing players
    });
    
    // Reset local state
    setBoard(Array(9).fill(''));
    setGameOver(false);
    setGameReady(existingPlayerCount === 2); // Only ready if both players still present
    setStatus(existingPlayerCount === 2 ? "Game restarted! Player X's Turn" : "Waiting for players...");
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
            style={{ cursor: (!playerSymbol || !gameReady || gameOver) ? 'not-allowed' : 'pointer', opacity: (!playerSymbol || !gameReady || gameOver) ? 0.6 : 1 }}
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