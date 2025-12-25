/**
 * URL validation utilities to prevent unsafe navigation
 * Prevents javascript:, data:, and other potentially malicious URL schemes
 */

const ALLOWED_SCHEMES = ["http:", "https:"];
const ALLOWED_HOSTS_PATTERN = /^(localhost|.*\.gov\.br|.*\.pbh\.gov\.br|.*\.bh\.gov\.br)$/i;

/**
 * Validates a URL for safe navigation
 * Returns true if the URL is safe, false otherwise
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.origin);

    // Check scheme is allowed
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return false;
    }

    // For absolute URLs, validate the host
    if (url.startsWith("http://") || url.startsWith("https://")) {
      // Allow government domains and localhost for development
      if (!ALLOWED_HOSTS_PATTERN.test(parsed.hostname)) {
        console.warn(`URL validation: blocked navigation to untrusted host: ${parsed.hostname}`);
        return false;
      }
    }

    return true;
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Returns the URL if valid, or undefined if not
 * Use this to conditionally render links
 */
export function getSafeUrl(url: string | undefined | null): string | undefined {
  return isValidUrl(url) ? url! : undefined;
}

/**
 * Safe external link component props helper
 * Adds rel="noopener noreferrer" for external links
 */
export function getSafeLinkProps(url: string | undefined | null): {
  href: string | undefined;
  rel?: string;
  target?: string;
} {
  const safeUrl = getSafeUrl(url);

  if (!safeUrl) {
    return { href: undefined };
  }

  // Check if it's an external link
  try {
    const parsed = new URL(safeUrl, window.location.origin);
    const isExternal = parsed.origin !== window.location.origin;

    return {
      href: safeUrl,
      ...(isExternal && {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    };
  } catch {
    return { href: undefined };
  }
}
