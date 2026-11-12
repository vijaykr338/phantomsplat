import type { Vec3 } from '../spatial/objectTypes'
import { sourcePointToViewer } from './coordinateTransform'
import type { GroundTruthAnnotation, GroundTruthRecord } from './types'

export function annotationFromRecord(
  record: GroundTruthRecord,
  rotationX: number,
): GroundTruthAnnotation {
  if (record.bounding_box.length !== 8) {
    throw new Error(`Ground-truth object ${record.ins_id} must have eight corners.`)
  }
  const corners = record.bounding_box.map((point) => sourcePointToViewer(point, rotationX))
  const min: Vec3 = [
    Math.min(...corners.map((corner) => corner[0])),
    Math.min(...corners.map((corner) => corner[1])),
    Math.min(...corners.map((corner) => corner[2])),
  ]
  const max: Vec3 = [
    Math.max(...corners.map((corner) => corner[0])),
    Math.max(...corners.map((corner) => corner[1])),
    Math.max(...corners.map((corner) => corner[2])),
  ]
  const center: Vec3 = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ]
  return {
    id: record.ins_id,
    label: record.label.trim().toLowerCase(),
    sourceCorners: record.bounding_box,
    min,
    max,
    center,
    bottomCenter: [center[0], min[1], center[2]],
    dimensions: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  }
}
