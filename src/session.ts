import { randomUUID } from "node:crypto";

/**
 * In-memory session store. Deliberately not persisted: the whole point of this
 * lab's SUT is to reset to a known state whenever the process restarts — see
 * docs/TEST_STRATEGY.md, "Test environment".
 */
const sessions = new Map<string, number>();

export function createSession(userId: number): string {
  const token = randomUUID();
  sessions.set(token, userId);
  return token;
}

export function resolveSession(token: string | undefined): number | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}

export const SESSION_COOKIE = "session";

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
