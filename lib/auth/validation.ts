export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < 8 || value.length > 72) return "Use a password between 8 and 72 characters.";
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name.length < 1 || name.length > 80) return "Enter a name between 1 and 80 characters.";
  return null;
}

// Never construct an authentication redirect from a request's Host header.
export function getSiteUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}
