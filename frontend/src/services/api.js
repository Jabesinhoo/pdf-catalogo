// frontend/src/services/api.js
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:4017/api' 
  : '/api';

export async function apiFetch(path, options = {}) {
  try {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_URL}${path}`, fetchOptions);

    // Si la sesión expiró, recargar automáticamente
    if (response.status === 401 && path !== '/auth/login') {
      console.warn('Sesión expirada, recargando...');
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.reload();
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    let data = null;

    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('El servidor devolvió JSON inválido.');
      }
    } else {
      if (rawText.trim().startsWith('<')) {
        throw new Error('El servidor devolvió HTML en vez de JSON.');
      }
      data = rawText;
    }

    if (!response.ok) {
      throw new Error(data?.message || `${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Error en apiFetch:', error);
    throw error;
  }
}

export { API_URL };