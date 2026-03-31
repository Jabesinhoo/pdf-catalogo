import { useEffect, useRef } from 'react';
export function useSessionKeepAlive(interval = 5 * 60 * 1000) {
  const intervalRef = useRef(null);

  useEffect(() => {
    const hasSession = document.cookie.includes('tecnocotizador.sid');

    if (!hasSession) return; // 🔥 NO hace nada si no hay sesión

    const keepAlive = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          console.log('Sesión expirada');
        }
      } catch (error) {
        console.error('Error en keep-alive:', error);
      }
    };

    intervalRef.current = setInterval(keepAlive, interval);

    return () => clearInterval(intervalRef.current);
  }, [interval]);
}