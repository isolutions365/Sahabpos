/**
 * Environment detection utility to distinguish between:
 * 1) Google AI Studio development/editor environment (where settings are editable)
 * 2) Published / Shared / Production deployment (where corporate info is strictly frozen for users)
 */

export const isAiStudioEnvironment = (): boolean => {
  if (typeof window === 'undefined') return true;

  try {
    const hostname = window.location.hostname.toLowerCase();
    const search = window.location.search;

    // Developer simulation toggle via localStorage or URL query param
    if (
      search.includes('force_freeze=true') ||
      search.includes('preview_publish=true') ||
      search.includes('mode=user') ||
      search.includes('published=true') ||
      localStorage.getItem('sahaab_simulate_published') === 'true'
    ) {
      return false;
    }

    // 1. Explicitly published / shared URLs:
    // 'ais-pre-' is Google AI Studio's Published / Shared URL
    if (
      hostname.startsWith('ais-pre-') ||
      hostname.includes('-pre-') ||
      (hostname.includes('.run.app') && !hostname.startsWith('ais-dev-') && !hostname.includes('-dev-'))
    ) {
      return false;
    }

    // 2. Production hosting domains (Firebase Hosting, Cloud Run custom, etc.)
    if (
      hostname.includes('web.app') ||
      hostname.includes('firebaseapp.com') ||
      hostname.includes('sahaab') && !hostname.includes('dev')
    ) {
      return false;
    }

    // 3. AI Studio development environment URL: starts with 'ais-dev-'
    if (hostname.startsWith('ais-dev-') || hostname.includes('-dev-')) {
      return true;
    }

    // 4. Localhost development
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // 5. Embedded inside Google AI Studio editor iframe (only if not on a published host)
    if (window.self !== window.top) {
      try {
        if (
          document.referrer &&
          (document.referrer.includes('aistudio.google.com') || document.referrer.includes('google.com')) &&
          !hostname.startsWith('ais-pre-')
        ) {
          return true;
        }
      } catch (e) {
        // Cross-origin iframe from AI Studio parent
        return true;
      }
    }

    // 6. Any other domain is treated as a published production deployment
    return false;
  } catch (e) {
    return false;
  }
};

export const isPublishedEnvironment = (): boolean => {
  return !isAiStudioEnvironment();
};

