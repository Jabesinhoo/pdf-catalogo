import { useEffect, useRef } from 'react';

export function useSessionKeepAlive(enabled = false, interval = 5 * 60 * 1000) {
  const intervalRef = useRef(null);

  useEffect(() => {
    const hasSession = document.cookie.includes('tecnocotizador.sid');

    if (!enabled || !hasSession || interval <= 0) {
      return;
    }

    const keepAlive = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          console.log('Sesión expirada o backend no disponible');
        }
      } catch (error) {
        console.error('Error en keep-alive:', error);
      }
    };

    intervalRef.current = setInterval(keepAlive, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, interval]);
}