export function resolveApiBaseUrl(subPath = ''): string {
  const isLocalDev = typeof window !== 'undefined' && window.location.port === '4200';
  const root = isLocalDev ? 'http://localhost:8080/api' : '/api';
  return subPath ? `${root}/${subPath.replace(/^\/+/, '')}` : root;
}
