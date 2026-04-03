/**
 * Ensures a URL has a protocol (http:// or https://)
 * @param {string} url - The URL to check
 * @param {string} defaultProtocol - Protocol to add if missing (default: https://)
 * @returns {string} - The URL with protocol
 */
export const ensureProtocol = (url, defaultProtocol = 'https://') => {
  if (!url || typeof url !== 'string') return url;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return trimmedUrl;

  // Check if it already has a protocol
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  // Check if it starts with // (protocol-relative)
  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  return `${defaultProtocol}${trimmedUrl}`;
};
