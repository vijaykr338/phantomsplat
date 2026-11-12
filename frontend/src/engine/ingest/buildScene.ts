import { annotationFromRecord } from '../../ground-truth/boundingBoxUtils'
import { sourcePointToViewer } from '../../ground-truth/coordinateTransform'
import type { GroundTruthRecord } from '../../ground-truth/types'
import type { SceneCatalog, SceneOpening, SceneRoom } from './types'
import { objectRoomId, polygonArea } from './geometry'

export interface StructureData {
  rooms?: { profile?: number[][] }[]
  holes?: { type?: string; profile?: number[][] }[]
}

const sourcePolygonToViewer = (profile: number[][], rotationX: number): [number, number][] =>
  profile.map(([x, y]) => {
    const point = sourcePointToViewer({ x, y, z: 0 }, rotationX)
    return [point[0], point[2]]
  })

export function buildSceneCatalog(
  records: GroundTruthRecord[],
  structure: StructureData,
  rotationX: number,
): SceneCatalog {
  const rooms: SceneRoom[] = (structure.rooms ?? [])
    .filter((room) => Array.isArray(room.profile) && room.profile.length >= 3)
    .map((room, index) => {
      const sourcePolygon = room.profile as [number, number][]
      const polygon = room.profile ? sourcePolygonToViewer(room.profile, rotationX) : []
      return {
        room_id: `room_${String(index + 1).padStart(3, '0')}`,
        source_polygon: sourcePolygon,
        polygon,
        area: polygonArea(polygon),
      }
    })

  const openings: SceneOpening[] = (structure.holes ?? [])
    .filter((opening) => Array.isArray(opening.profile))
    .map((opening) => ({
      type: opening.type ?? 'unknown',
      source_profile: opening.profile ?? [],
    }))

  const warnings: string[] = []
  const objects = records.map((record) => {
    const annotation = annotationFromRecord(record, rotationX)
    const object = {
      object_id: annotation.id,
      label: annotation.label,
      source_corners: annotation.sourceCorners,
      min: annotation.min,
      max: annotation.max,
      center: annotation.center,
      dimensions: annotation.dimensions,
      volume: annotation.dimensions.reduce((product, value) => product * value, 1),
      room_id: objectRoomId(annotation.center, rooms),
    }
    if (object.room_id === null) {
      warnings.push(`Object ${object.object_id} (${object.label}) is outside all rooms.`)
    }
    return object
  })

  return {
    schema_version: 1,
    coordinate_space: 'viewer_world_v1',
    objects,
    rooms,
    openings,
    warnings,
  }
}

export function catalogJson(catalog: SceneCatalog): string {
  return JSON.stringify(catalog, null, 2)
}
