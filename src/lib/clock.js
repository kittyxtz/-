export const clockSize = 280;
export const outerRadius = 112;
export const innerRadius = 74;

export function shortestClockTurn(current, target) {
  return current + ((target - current) % 360 + 540) % 360 - 180;
}

export function clockPosition(value, part) {
  const angle = (part === 'hour' ? value % 12 : value / 5) * Math.PI / 6;
  const radius = part === 'hour' && value >= 12 ? innerRadius : outerRadius;
  return { x: clockSize / 2 + Math.sin(angle) * radius, y: clockSize / 2 - Math.cos(angle) * radius };
}

export function clockValueAt(x, y, size, part) {
  const dx = x - size / 2, dy = y - size / 2;
  if (Math.hypot(dx, dy) < size * .035) return null;
  const turn = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
  if (part === 'minute') return Math.round(turn * 60 / (Math.PI * 2)) % 60;
  const hour = Math.round(turn * 12 / (Math.PI * 2)) % 12;
  const inner = Math.hypot(dx, dy) < (outerRadius + innerRadius) / 2 * size / clockSize;
  return hour + (inner ? 12 : 0);
}

export function clockBlocked(value, part, hour, minimum) {
  return part === 'hour' ? (value + 1) * 60 <= minimum : hour * 60 + value < minimum;
}
