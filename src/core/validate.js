export function validatePlayerName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 12;
}
