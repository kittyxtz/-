export function pagerTarget(index, count, distance, width, velocity = 0) {
  const deliberate = Math.abs(distance) >= width * .25;
  const flick = Math.abs(distance) >= 18 && Math.abs(velocity) >= .35 && Math.sign(distance) === Math.sign(velocity);
  const next = deliberate || flick ? index + (distance < 0 ? 1 : -1) : index;
  return Math.max(0, Math.min(count - 1, next));
}
