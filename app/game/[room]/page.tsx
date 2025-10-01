'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Board from '@/components/Board';

export default function GamePage() {
  const params = useParams();
  const room = params.room as string;
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (room.length === 6 && !showKey) {
      setShowKey(true);
    }
  }, [room]);

  if (!room || room.length !== 6) {
    return <p>Invalid room. Go back and try again!</p>;
  }

  return (
    <div>
      {showKey && <p className="status">Secret Key: <span style={{color: '#6bcf7f', fontSize: '1.5em'}}>{room}</span></p>}
      <Board room={room} />
    </div>
  );
}