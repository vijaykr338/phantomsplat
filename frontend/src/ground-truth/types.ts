import type { Vec3 } from '../spatial/objectTypes'

export interface GroundTruthSourcePoint {
  x: number
  y: number
  z: number
}

export interface GroundTruthRecord {
  ins_id: string
  label: string
  bounding_box: GroundTruthSourcePoint[]
}

export interface GroundTruthAnnotation {
  id: string
  label: string
  sourceCorners: GroundTruthSourcePoint[]
  min: Vec3
  max: Vec3
  center: Vec3
  bottomCenter: Vec3
  dimensions: Vec3
}
