export type Vec3 = [number, number, number]

export type AnchorType = 'floor_center' | 'wall_center' | 'custom'

export interface SpatialObject {
  object_id: string
  source_candidate_ids: string[]
  label: string
  aliases: string[]
  category: string
  description: string
  position: Vec3
  anchor_type: AnchorType
  visible_in: string[]
  verified: boolean
}

export const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item))

export const isSpatialObject = (value: unknown): value is SpatialObject => {
  if (!value || typeof value !== 'object') return false
  const object = value as Partial<SpatialObject>
  return (
    typeof object.object_id === 'string' &&
    typeof object.label === 'string' &&
    isVec3(object.position) &&
    Array.isArray(object.aliases) &&
    Array.isArray(object.source_candidate_ids) &&
    typeof object.category === 'string' &&
    typeof object.description === 'string' &&
    (object.anchor_type === 'floor_center' ||
      object.anchor_type === 'wall_center' ||
      object.anchor_type === 'custom') &&
    Array.isArray(object.visible_in) &&
    typeof object.verified === 'boolean'
  )
}
