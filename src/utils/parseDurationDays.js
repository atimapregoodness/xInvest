// utils/parseDurationDays.js

/**
 * Parses a duration string or number into a number of days.
 * Supports formats:
 * - Number: treated as days
 * - "Xd" -> X days
 * - "Xh" -> X hours (converted to days)
 * - "Xw" -> X weeks (converted to days)
 *
 * @param {string|number} duration
 * @returns {number} Days
 */
function parseDurationDays(duration) {
  if (!duration) return 1; // default 1 day
  if (!isNaN(Number(duration))) return Number(duration);

  const s = String(duration).trim().toLowerCase();

  const hourMatch = s.match(/^(\d+(?:\.\d+)?)h$/);
  const dayMatch = s.match(/^(\d+(?:\.\d+)?)d$/);
  const weekMatch = s.match(/^(\d+(?:\.\d+)?)w$/);

  if (hourMatch) return Number(hourMatch[1]) / 24;
  if (dayMatch) return Number(dayMatch[1]);
  if (weekMatch) return Number(weekMatch[1]) * 7;

  // fallback
  return 1;
}

module.exports = parseDurationDays;
