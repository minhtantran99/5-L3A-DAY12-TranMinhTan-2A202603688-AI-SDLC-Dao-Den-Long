import fs from 'node:fs';
import path from 'node:path';
export { validatePlayerName } from './validate.js';

export const DEFAULT_LEADERBOARD_PATH = path.resolve(process.cwd(), 'data/leaderboard.json');

export function sortLeaderboard(entries) {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.achieved_at).getTime() - new Date(b.achieved_at).getTime();
    })
    .slice(0, 10);
}

export function readLeaderboard(filePath = DEFAULT_LEADERBOARD_PATH) {
  try {
    if (!fs.existsSync(filePath)) return { entries: [] };
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return { entries: sortLeaderboard(entries) };
  } catch {
    return { entries: [] };
  }
}

export function addLeaderboardEntry(entry, filePath = DEFAULT_LEADERBOARD_PATH) {
  const { entries } = readLeaderboard(filePath);
  const next = sortLeaderboard([...entries, entry]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ entries: next }, null, 2) + '\n', 'utf8');
  return next;
}
