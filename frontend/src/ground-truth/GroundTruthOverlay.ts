import * as THREE from 'three'
import type { GroundTruthAnnotation } from './types'

export interface GroundTruthOverlayOptions {
  group: THREE.Group
  annotations: GroundTruthAnnotation[]
  selectedId: string | null
  highlightedIds?: Set<string>
  onSelect: (id: string) => void
}

export function rebuildGroundTruthOverlay({
  group,
  annotations,
  selectedId,
  highlightedIds = new Set(),
  onSelect,
}: GroundTruthOverlayOptions): void {
  group.children.forEach((child) => {
    child.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
        node.geometry.dispose()
        if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose())
        else node.material.dispose()
      }
      if (node instanceof THREE.Sprite) {
        node.material.map?.dispose()
        node.material.dispose()
      }
    })
  })
  group.clear()

  annotations.forEach((annotation) => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(...annotation.min),
      new THREE.Vector3(...annotation.max),
    )
    const size = bounds.getSize(new THREE.Vector3())
    const center = bounds.getCenter(new THREE.Vector3())
    const selected = annotation.id === selectedId || highlightedIds.has(annotation.id)
    const box = new THREE.BoxGeometry(size.x, size.y, size.z)
    const edges = new THREE.EdgesGeometry(box)
    const wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: annotation.id === selectedId ? '#fef08a' : '#38bdf8',
        transparent: true,
        opacity: selected ? 1 : 0.82,
        depthTest: false,
      }),
    )
    wireframe.position.copy(center)
    wireframe.renderOrder = 30
    wireframe.userData.groundTruthId = annotation.id
    group.add(wireframe)

    const hitbox = new THREE.Mesh(
      box,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    )
    hitbox.position.copy(center)
    hitbox.userData.groundTruthId = annotation.id
    hitbox.userData.onGroundTruthSelect = onSelect
    group.add(hitbox)

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 72
    const context = canvas.getContext('2d')
    if (!context) return
    context.font = '600 27px Inter, sans-serif'
    context.fillStyle = selected ? '#fef08a' : '#fff7ed'
    context.fillText(`${annotation.label} · #${annotation.id}`, 8, 42)
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthTest: false,
    }))
    label.position.set(annotation.center[0], annotation.max[1] + 0.18, annotation.center[2])
    label.scale.set(1.55, 0.22, 1)
    label.renderOrder = 31
    group.add(label)
  })
}
