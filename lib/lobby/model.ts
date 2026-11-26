export type LobbyPlayer = { id: string; nickname: string; online: boolean };
export type GameQuestion = {
  index: number; total: number; text: string; options: string[]; points: number;
  closesAt: string; canAnswer: boolean; answerCount: number;
  selectedIndex?: number | null; correctIndex?: number; explanation?: string;
};
export type LeaderboardEntry = { id: string; nickname: string; score: number; correct?: number; incorrect?: number; unanswered?: number };
export type LobbyState = {
  code: string; channelId: string; title: string; status: "waiting" | "question" | "reveal" | "finished" | "ended" | "expired";
  players: LobbyPlayer[]; nickname?: string; playerId?: string; id?: string; expiresAt?: string; serverNow?: string;
  question?: GameQuestion; score?: number; leaderboard?: LeaderboardEntry[]; finishReason?: "completed" | "stopped" | null;
};
export function validPin(value: unknown): value is string { return typeof value === "string" && /^[0-9]{6}$/.test(value); }
export function validateNickname(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 24 || /[\x00-\x1f\x7f]/.test(value)) return "Use a nickname between 2 and 24 characters without control characters.";
  return null;
}
export function validAnswer(value: unknown): value is { questionIndex: number; optionIndex: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { questionIndex, optionIndex } = value as Record<string, unknown>;
  return Number.isInteger(questionIndex) && (questionIndex as number) >= 0 && (questionIndex as number) <= 49 && Number.isInteger(optionIndex) && (optionIndex as number) >= 0 && (optionIndex as number) <= 3;
}
