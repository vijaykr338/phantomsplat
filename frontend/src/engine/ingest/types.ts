import type { Vec3 } from '../../spatial/objectTypes'
import type { GroundTruthSourcePoint } from '../../ground-truth/types'

export interface SceneObject {
  object_id: string
  label: string
  source_corners: GroundTruthSourcePoint[]
  min: Vec3
  max: Vec3
  center: Vec3
  dimensions: Vec3
  volume: number
  room_id: string | null
}

export interface SceneRoom {
  room_id: string
  source_polygon: [number, number][]
  polygon: [number, number][]
  area: number
}

export interface SceneOpening {
  type: string
  source_profile: number[][]
}

export interface SceneCatalog {
  schema_version: 1
  coordinate_space: 'viewer_world_v1'
  objects: SceneObject[]
  rooms: SceneRoom[]
  openings: SceneOpening[]
  warnings: string[]
}

export interface GroundTruthLoadReport {
  records: import('../../ground-truth/types').GroundTruthRecord[]
  skippedRoomRecords: number
  invalidRecords: number
}
