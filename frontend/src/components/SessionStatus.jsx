import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function SessionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState(Date.now());

  useEffect(() => {
    const ping = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        setIsConnected(response.ok);
        setLastPing(Date.now());
      } catch {
        setIsConnected(false);
      }
    };

    ping();
    const interval = setInterval(ping, 60000); 
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="session-status" title={isConnected ? 'Sesión activa' : 'Sesión expirada'}>
      {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
    </div>
  );
}

export default SessionStatus;