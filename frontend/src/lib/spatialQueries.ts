import type { LoadedSpatialIndex, SpatialObjectRecord, SpatialRelationship } from './spatialData'

export function getAllObjects(index: LoadedSpatialIndex): SpatialObjectRecord[] {
  return index.objects
}

export function getRelationshipsForObject(
  index: LoadedSpatialIndex,
  objectId: string,
): SpatialRelationship[] {
  return index.relationships.filter(
    (relationship) =>
      relationship.subject_id === objectId || relationship.object_id === objectId,
  )
}

export function getRelatedObjects(
  index: LoadedSpatialIndex,
  objectId: string,
  relation = 'near',
): SpatialObjectRecord[] {
  const ids = new Set(
    index.relationships
      .filter(
        (relationship) =>
          relationship.relation === relation &&
          (relationship.subject_id === objectId || relationship.object_id === objectId),
      )
      .map((relationship) =>
        relationship.subject_id === objectId
          ? relationship.object_id
          : relationship.subject_id,
      ),
  )
  return index.objects.filter((object) => ids.has(object.object_id))
}

export function resolveObjectQuery(
  index: LoadedSpatialIndex,
  query: string,
): SpatialObjectRecord | undefined {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return undefined
  return index.objects.find(
    (object) =>
      object.object_id.toLowerCase() === normalized ||
      object.label.toLowerCase() === normalized,
  )
}

export function executeSpatialQuery(
  index: LoadedSpatialIndex,
  query: string,
): { answer: string; objects: SpatialObjectRecord[] } {
  const normalized = query.trim().toLowerCase().replace(/[?.!]+$/, '')
  if (/all objects|objects in the living room/.test(normalized)) {
    return { answer: `Found ${index.objects.length} objects.`, objects: index.objects }
  }

  const match = normalized.match(/(?:near|next to)\s+(?:the\s+)?(.+)$/)
  if (match) {
    const object = resolveObjectQuery(index, match[1])
    if (object) {
      const objects = getRelatedObjects(index, object.object_id, 'near')
      return {
        answer: `${object.label} has ${objects.length} nearby indexed objects.`,
        objects,
      }
    }
  }

  const object = resolveObjectQuery(
    index,
    normalized.replace(/^(where is|highlight)\s+(?:the\s+)?/, ''),
  )
  return object
    ? { answer: `${object.label} (${object.object_id}) is indexed.`, objects: [object] }
    : { answer: 'No indexed object matched that query.', objects: [] }
}
