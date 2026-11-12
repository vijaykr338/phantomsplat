import type { Vec3 } from '../../spatial/objectTypes'

export function polygonArea(polygon: [number, number][]): number {
  let area = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(area) / 2
}

export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index]
    const [previousX, previousY] = polygon[previous]
    const intersects =
      y > point[1] !== previousY > point[1] &&
      point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    if (intersects) inside = !inside
  }
  return inside
}

export function objectRoomId(center: Vec3, rooms: { room_id: string; polygon: [number, number][] }[]) {
  const room = rooms.find((item) => pointInPolygon([center[0], center[2]], item.polygon))
  return room?.room_id ?? null
}
