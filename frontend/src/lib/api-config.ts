/**
 * Global API Configuration
 * 
 * In development, VITE_API_URL can be set to http://localhost:5010/api
 * In production, it defaults to the live domain.
 */

// Use the Vite environment variable if provided
// In DEV mode, we default to empty string so that relative paths work with the Vite proxy
// In PROD mode, we default to the live secure domain
const isDev = (import.meta as any).env.DEV;
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 
  (isDev ? '' : (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'https://britsyncai.com/api'));

/**
 * Normalizes and returns a full API URL for a given endpoint path.
 * @param path The endpoint path (e.g., '/auth/login' or 'team/register')
 */
export const getApiUrl = (path: string): string => {
  // If the path is already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // If we are in dev and have no absolute base URL, use relative paths for the Vite proxy
  if (isDev && (!API_BASE_URL || !API_BASE_URL.startsWith('http'))) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  }

  // Ensure the base doesn't have a trailing slash
  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  
  // Ensure the path starts with a single slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // In development, if we want to use the Vite proxy, we should use relative paths.
  // We can detect this if API_BASE_URL is just '/api'
  if (API_BASE_URL === '/api' || !API_BASE_URL.startsWith('http')) {
    return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
};

export default API_BASE_URL;
