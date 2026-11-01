export function advanceOledGesture(previous, at) {
  return { count: at - previous.at <= 1600 ? previous.count + 1 : 1, at };
}
