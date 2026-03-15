const BASE = "abcdefghijklmnopqrstuvwxyz";

function randomChar(): string {
  return BASE[Math.floor(Math.random() * BASE.length)];
}

export function midpoint(a: string, b: string): string {
  if (a && b && a >= b) [a, b] = [b, a];

  if (!a && !b) return "m";

  if (!a) {
    const firstChar = b.charAt(0);
    const idx = BASE.indexOf(firstChar);
    if (idx <= 0) return BASE[0] + randomChar();
    return BASE[Math.floor(idx / 2)] + randomChar();
  }

  if (!b) {
    const lastChar = a.charAt(a.length - 1);
    const idx = BASE.indexOf(lastChar);
    if (idx >= BASE.length - 1) return a + "m" + randomChar();
    return a.charAt(0) + BASE[Math.min(idx + Math.floor((BASE.length - idx) / 2), BASE.length - 1)] + randomChar();
  }

  let i = 0;
  let result = "";

  while (true) {
    const ca = i < a.length ? BASE.indexOf(a[i]) : -1;
    const cb = i < b.length ? BASE.indexOf(b[i]) : BASE.length;

    if (cb - ca > 1) {
      result += BASE[ca + Math.floor((cb - ca) / 2)];
      break;
    }

    result += BASE[Math.max(ca, 0)];
    i++;

    if (i > 50) {
      result += "m";
      break;
    }
  }

  return result + randomChar() + randomChar();
}
