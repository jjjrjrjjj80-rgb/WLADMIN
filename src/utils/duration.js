// يحول نص مدة مثل "4d" أو "12h" أو "30m" أو "1w" إلى ميلي ثانية
function parseDurationMs(input) {
  const match = /^(\d+)\s*(m|h|d|w)$/i.exec(String(input).trim());
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const unitMs = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * unitMs[unit];
}

module.exports = { parseDurationMs };
