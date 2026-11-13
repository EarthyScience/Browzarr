export function setCookie(name: string, value: string | boolean, days = 30): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(JSON.stringify(value))}` +
    `; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | boolean | undefined {
  const target = encodeURIComponent(name) + "=";
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(target)) {
      return JSON.parse(decodeURIComponent(part.slice(target.length)));
    }
  }
  return undefined;
}