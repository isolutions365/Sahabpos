/**
 * Environment detection helper.
 * Returns true if running inside AI Studio preview or local development server.
 * Returns false when running in a published / production deployment (e.g. sahaab-pos.web.app).
 */
export function isAiStudioEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host.includes('ai.studio') ||
    host.includes('run.app') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('aistudio')
  );
}
