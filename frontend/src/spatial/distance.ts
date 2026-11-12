import type { SpatialObject, Vec3 } from './objectTypes'

export const distance = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

export const isNear = (a: Vec3, b: Vec3, threshold = 1.5) =>
  distance(a, b) <= threshold

export function nearest(origin: Vec3, objects: SpatialObject[]): SpatialObject | undefined {
  return objects.reduce<SpatialObject | undefined>(
    (closest, object) =>
      !closest || distance(origin, object.position) < distance(origin, closest.position)
        ? object
        : closest,
    undefined,
  )
}
