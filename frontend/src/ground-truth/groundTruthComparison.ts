import { distance } from '../spatial/distance'
import type { SpatialObject } from '../spatial/objectTypes'
import type { GroundTruthAnnotation } from './types'

export function compareAnchor(
  anchor: SpatialObject,
  annotation: GroundTruthAnnotation,
): number {
  const target = anchor.anchor_type === 'floor_center'
    ? annotation.bottomCenter
    : annotation.center
  return distance(anchor.position, target)
}

export function sameLabelCandidates(
  anchor: SpatialObject,
  annotations: GroundTruthAnnotation[],
): GroundTruthAnnotation[] {
  return annotations.filter((annotation) => annotation.label === anchor.label.toLowerCase())
}
