const windowsTimezones = require('./windowsTimezones.json');

/**
 * Checks if a timezone string looks like a valid IANA timezone identifier.
 * @param {string} timezone - Timezone identifier to check.
 * @returns {boolean} True if the timezone appears to be IANA format.
 */
function isIanaTimezone(timezone) {
  return /\w+\/[\w_+-]+/.test(timezone) || timezone.startsWith('Etc/');
}

/**
 * Checks if a timezone string looks like a Windows timezone identifier.
 * @param {string} timezone - Timezone identifier to check.
 * @returns {boolean} True if the timezone looks like a Windows ID.
 */
function isLikelyWindowsTimezone(timezone) {
  if (isIanaTimezone(timezone)) {
    return false;
  }

  return /\bTime$/.test(timezone) || /\bStandard Time$/.test(timezone) || /\bDaylight Time$/.test(timezone);
}

/**
 * Normalize a single timezone identifier.
 * @param {string} timezone - Original timezone identifier.
 * @returns {{ timezone: string, changed: boolean, unknownWindows: boolean }} Normalized timezone metadata.
 */
function normalizeWindowsTimezoneId(timezone) {
  const trimmed = typeof timezone === 'string' ? timezone.trim() : '';

  if (!trimmed) {
    return { timezone: timezone, changed: false, unknownWindows: false };
  }

  if (windowsTimezones[trimmed]) {
    return { timezone: windowsTimezones[trimmed], changed: true, unknownWindows: false };
  }

  if (isIanaTimezone(trimmed)) {
    return { timezone: trimmed, changed: false, unknownWindows: false };
  }

  if (isLikelyWindowsTimezone(trimmed)) {
    return { timezone: 'UTC', changed: true, unknownWindows: true };
  }

  return { timezone: trimmed, changed: false, unknownWindows: false };
}

/**
 * Normalize Windows timezone identifiers inside raw ICS data.
 * @param {string} icsData - Raw ICS data.
 * @returns {string} Normalized ICS data with Windows TZIDs mapped to IANA TZIDs.
 */
function normalizeWindowsTimezones(icsData) {
  if (!icsData || typeof icsData !== 'string') {
    return icsData;
  }

  const unknownWindows = new Set();

  const normalizeValue = (value) => {
    const hasQuotes = /^\s*".*"\s*$/.test(value);
    const unquoted = value.trim().replace(/^"(.*)"$/, '$1');
    const result = normalizeWindowsTimezoneId(unquoted);

    if (result.unknownWindows) {
      unknownWindows.add(unquoted);
    }

    return hasQuotes ? `"${result.timezone}"` : result.timezone;
  };

  let normalized = icsData;

  normalized = normalized.replace(/TZID=([^:;]+)/g, (match, value) => {
    const mapped = normalizeValue(value);
    return `TZID=${mapped}`;
  });

  normalized = normalized.replace(/TZID:([^\r\n]+)/g, (match, value) => {
    const mapped = normalizeValue(value);
    return `TZID:${mapped}`;
  });

  normalized = normalized.replace(/X-WR-TIMEZONE:([^\r\n]+)/g, (match, value) => {
    const mapped = normalizeValue(value);
    return `X-WR-TIMEZONE:${mapped}`;
  });

  if (unknownWindows.size > 0) {
    console.warn(`[Calendar] Unknown Windows timezone IDs detected: ${[...unknownWindows].join(', ')}. Falling back to UTC.`);
  }

  return normalized;
}

module.exports = {
  normalizeWindowsTimezones,
  normalizeWindowsTimezoneId
};
