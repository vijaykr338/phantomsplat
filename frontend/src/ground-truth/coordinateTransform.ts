import * as THREE from 'three'
import type { Vec3 } from '../spatial/objectTypes'
import type { GroundTruthSourcePoint } from './types'

export const sourcePointToViewer = (
  point: GroundTruthSourcePoint,
  rotationX: number,
): Vec3 => {
  const transformed = new THREE.Vector3(point.x, point.y, point.z)
    .applyEuler(new THREE.Euler(rotationX, 0, 0, 'XYZ'))
  return transformed.toArray() as Vec3
}
