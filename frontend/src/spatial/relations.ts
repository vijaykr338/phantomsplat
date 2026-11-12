import type { SpatialObject, Vec3 } from './objectTypes'

export type Direction = 'left_of' | 'right_of' | 'in_front_of' | 'behind' | 'above' | 'below'

export function hasDirection(
  subject: Vec3,
  reference: Vec3,
  direction: Direction,
  deadZone = 0.3,
): boolean {
  const dx = subject[0] - reference[0]
  const dy = subject[1] - reference[1]
  const dz = subject[2] - reference[2]
  switch (direction) {
    case 'left_of': return dx < -deadZone
    case 'right_of': return dx > deadZone
    case 'in_front_of': return dz < -deadZone
    case 'behind': return dz > deadZone
    case 'above': return dy > deadZone
    case 'below': return dy < -deadZone
  }
}

export function relatedByDirection(
  subject: SpatialObject,
  objects: SpatialObject[],
  direction: Direction,
  deadZone = 0.3,
) {
  return objects.filter((object) =>
    object.object_id !== subject.object_id &&
    hasDirection(object.position, subject.position, direction, deadZone),
  )
}
