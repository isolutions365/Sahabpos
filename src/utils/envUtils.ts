/**
 * Environment detection utility to distinguish between:
 * 1) Google AI Studio development/editor environment (where settings are editable)
 * 2) Published / Shared / Production deployment (where corporate info is strictly frozen)
 */

export const isAiStudioEnvironment = (): boolean => {
  if (typeof window === 'undefined') return true;

  try {
    const hostname = window.location.hostname.toLowerCase();
    const search = window.location.search;

    // Optional query parameter to force simulated published mode for developer inspection in AI Studio
    if (search.includes('force_freeze=true') || search.includes('preview_publish=true')) {
      return false;
    }

    // 1. Explicitly published URLs: 'ais-pre-' is Google AI Studio's Published / Shared URL
    if (hostname.startsWith('ais-pre-') || hostname.includes('-pre-') || hostname.includes('.run.app') && hostname.includes('-pre')) {
      return false;
    }

    // 2. AI Studio development environment URL: starts with 'ais-dev-'
    if (hostname.startsWith('ais-dev-') || hostname.includes('-dev-')) {
      return true;
    }

    // 3. Localhost development
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return true;
    }

    // 4. Embedded inside Google AI Studio editor iframe
    if (window.self !== window.top) {
      try {
        if (document.referrer && (document.referrer.includes('aistudio.google.com') || document.referrer.includes('google.com'))) {
          return true;
        }
      } catch (e) {
        // Cross-origin iframe from AI Studio parent
        return true;
      }
      return true;
    }

    // 5. Any production domain, custom domain, or public host is treated as published
    return false;
  } catch (e) {
    return false;
  }
};

export const isPublishedEnvironment = (): boolean => {
  return !isAiStudioEnvironment();
};
