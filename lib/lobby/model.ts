export type LobbyPlayer = { id: string; nickname: string; online: boolean };
export type LobbyState = { code: string; channelId: string; title: string; status: "waiting" | "ended" | "expired"; players: LobbyPlayer[]; nickname?: string; id?: string; expiresAt?: string };
export function validPin(value: unknown): value is string { return typeof value === "string" && /^[0-9]{6}$/.test(value); }
export function validateNickname(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 24 || /[\x00-\x1f\x7f]/.test(value)) return "Use a nickname between 2 and 24 characters without control characters.";
  return null;
}
