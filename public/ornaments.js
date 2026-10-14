// Interior of the three branch tiers, leaving room for the outline and lights.
export function branchWidth(y) {
  if (y <= 225) return .53 * (y - 112) - 10;
  if (y < 252) return 30 + (y - 240) * .6;
  if (y <= 331) return .75 * (y - 240) + 32;
  if (y <= 355) return (y - 345) * .85 + 62;
  return .68 * (y - 345) + 62;
}

export function ornamentLayout(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid ornament count');
  if (!count) return [];
  let radius = 10;
  let slots;
  do {
    slots = [];
    const gap = radius * 2 + Math.min(5, radius * .6);
    let row = 0;
    for (let y = 178; y <= 444; y += gap, row++) {
      const width = branchWidth(y) - radius - 3;
      for (let col = 0, x = 250 - width; x <= 250 + width; x += gap, col++) {
        let priority = Math.imul(row + 1, 73856093) ^ Math.imul(col + 1, 19349663);
        priority = Math.imul(priority ^ (priority >>> 16), 0x7feb352d);
        priority = Math.imul(priority ^ (priority >>> 15), 0x846ca68b);
        priority = (priority ^ (priority >>> 16)) >>> 0;
        slots.push({ x, y, r: radius, priority });
      }
    }
    if (slots.length < count) radius *= .86;
  } while (slots.length < count);
  // Spread the first registrations over the entire tree, then fill the gaps.
  slots.sort((a, b) => a.y - b.y || a.priority - b.priority);
  return Array.from({ length: count }, (_, i) => {
    const { x, y, r } = slots[Math.floor((i + .5) * slots.length / count)];
    return { x, y, r };
  });
}
