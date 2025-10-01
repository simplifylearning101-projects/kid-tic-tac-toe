'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';

interface GameRoom {
  board: string[];
  turn: 'X' | 'O';
  over: boolean;
  players: {
    [key: string]: 'X' | 'O';
  };
}

interface RoomsData {
  [key: string]: GameRoom;
}

const ADMIN_PASSWORD = 'admin123'; // In production, use environment variables

export default function Connection() {
  const [roomInput, setRoomInput] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [rooms, setRooms] = useState<RoomsData>({});
  const router = useRouter();

  const generateKey = () => Math.floor(100000 + Math.random() * 900000).toString();

  useEffect(() => {
    if (isAdmin) {
      const gamesRef = ref(db, 'games');
      const unsubscribe = onValue(gamesRef, (snapshot) => {
        if (snapshot.exists()) {
          setRooms(snapshot.val());
        } else {
          setRooms({});
        }
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdmin(false);
      setAdminPassword('');
    } else {
      alert('Incorrect admin password');
    }
  };

  const removeRoom = async (roomId: string) => {
    if (confirm(`Are you sure you want to delete room ${roomId}?`)) {
      await set(ref(db, `games/${roomId}`), null);
    }
  };

  const createGame = () => {
    const room = generateKey();
    router.push(`/game/${room}`);
  };

  const joinGame = async () => {
    const room = roomInput.trim();
    if (!/^\d{6}$/.test(room)) {
      alert('Secret key must be a 6-digit number!');
      return;
    }

    // Check if room exists
    const gameRef = ref(db, `games/${room}`);
    const snapshot = await get(gameRef);
    
    if (!snapshot.exists()) {
      alert('Room not found! Please check the room number.');
      return;
    }

    // Check if room is full (2 players)
    const players = snapshot.val().players || {};
    if (Object.keys(players).length >= 2) {
      alert('This room is full!');
      return;
    }

    router.push(`/game/${room}`);
  };

  return (
    <div className="connection">
      <h1>🎮 Tic Tac Toe 🎮</h1>
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

      <div style={{ marginTop: '2em' }}>
        {!isAdmin && (
          <button 
            onClick={() => setShowAdmin(true)}
            style={{ 
              backgroundColor: '#666', 
              color: 'white', 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Admin Access
          </button>
        )}

        {showAdmin && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            <form onSubmit={handleAdminLogin}>
              <h3>Admin Authentication</h3>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{ 
                  margin: '10px 0',
                  padding: '8px',
                  width: '100%',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="submit"
                  style={{ 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    padding: '8px 16px', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Login
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAdmin(false);
                    setAdminPassword('');
                  }}
                  style={{ 
                    backgroundColor: '#666', 
                    color: 'white', 
                    padding: '8px 16px', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isAdmin && (
          <div style={{ 
            marginTop: '2em', 
            padding: '20px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '8px' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1em' 
            }}>
              <h2 style={{ margin: 0 }}>Admin Panel</h2>
              <button 
                onClick={() => setIsAdmin(false)}
                style={{ 
                  backgroundColor: '#666', 
                  color: 'white', 
                  padding: '8px 16px', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto' 
            }}>
              <h3>Active Rooms:</h3>
              {Object.entries(rooms).length === 0 ? (
                <p>No active rooms</p>
              ) : (
                Object.entries(rooms).map(([roomId, room]) => (
                  <div 
                    key={roomId} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px',
                      backgroundColor: 'white',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div>
                      <strong>Room: {roomId}</strong>
                      <br />
                      <small>
                        Players: {Object.keys(room.players || {}).length}/2 | 
                        Status: {room.over ? 'Game Over' : 'Active'}
                      </small>
                    </div>
                    <button 
                      onClick={() => removeRoom(roomId)}
                      style={{ 
                        backgroundColor: '#ff4444', 
                        color: 'white', 
                        padding: '4px 8px', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}