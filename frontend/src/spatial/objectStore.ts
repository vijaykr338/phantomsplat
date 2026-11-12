import { isSpatialObject, type SpatialObject, type Vec3 } from './objectTypes'

const STORAGE_KEY = 'spatial-rag:objects:v1'

const nextId = (objects: SpatialObject[]) => {
  const highest = objects.reduce((max, object) => {
    const match = object.object_id.match(/^obj_(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `obj_${String(highest + 1).padStart(3, '0')}`
}

export function loadObjects(storage: Storage = window.localStorage): SpatialObject[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSpatialObject) : []
  } catch (error) {
    console.error('Unable to load registered spatial objects:', error)
    return []
  }
}

export function saveObjects(objects: SpatialObject[], storage: Storage = window.localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(objects))
  } catch (error) {
    console.error('Unable to save registered spatial objects:', error)
    throw new Error('Registered objects could not be saved.')
  }
}

export function createSpatialObject(
  label: string,
  position: Vec3,
  objects: SpatialObject[],
): SpatialObject {
  const normalized = label.trim().toLowerCase()
  if (!normalized) throw new Error('Object label is required.')
  return {
    object_id: nextId(objects),
    source_candidate_ids: [],
    label: normalized,
    aliases: [],
    category: 'other',
    description: `Hand-registered ${normalized}`,
    position,
    anchor_type: 'floor_center',
    visible_in: [],
    verified: false,
  }
}

export { STORAGE_KEY }
