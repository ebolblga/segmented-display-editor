export function getColor(
  numSegments: number,
  segmentIndex: number,
): [r: number, g: number, b: number, a: number] {
  if (numSegments <= 0) return [0, 0, 0, 255]

  // Normalize hue based on index
  const hue = (segmentIndex % numSegments) * (360 / numSegments)

  // HSV to RGB (s = 1, v = 1)
  const c = 1 // chroma = v * s
  const x = 1 - Math.abs(((hue / 60) % 2) - 1)
  const m = 0 // since v = 1

  let r = 0,
    g = 0,
    b = 0
  if (hue < 60) {
    r = c
    g = x
    b = 0
  }
  else if (hue < 120) {
    r = x
    g = c
    b = 0
  }
  else if (hue < 180) {
    r = 0
    g = c
    b = x
  }
  else if (hue < 240) {
    r = 0
    g = x
    b = c
  }
  else if (hue < 300) {
    r = x
    g = 0
    b = c
  }
  else {
    r = c
    g = 0
    b = x
  }

  // Scale to 0–255
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    255,
  ]
}
