export const sidebarCompactWidth = 76;
export const sidebarMinimumWidth = 256;
export const sidebarDefaultWidth = 304;
export const sidebarMaximumWidth = 440;

export function sidebarWidth(value, maximum = sidebarMaximumWidth) {
  return value < sidebarMinimumWidth ? sidebarCompactWidth : Math.round(Math.min(maximum, value));
}

export function sidebarStep(width, direction, maximum = sidebarMaximumWidth) {
  if (width === sidebarCompactWidth && direction > 0) return sidebarMinimumWidth;
  return sidebarWidth(width + direction * 16, maximum);
}

export function sidebarDragWidth(value, initialWidth, maximum = sidebarMaximumWidth) {
  const threshold = initialWidth === sidebarCompactWidth ? sidebarCompactWidth + 48 : sidebarMinimumWidth - 48;
  if (value < threshold || (initialWidth !== sidebarCompactWidth && value === threshold)) return sidebarCompactWidth;
  return Math.round(Math.max(sidebarMinimumWidth, Math.min(maximum, value)));
}

export function sidebarReleasedWidth(value, maximum = sidebarMaximumWidth) {
  return value === sidebarCompactWidth ? sidebarCompactWidth : Math.max(sidebarMinimumWidth, Math.min(maximum, value));
}
