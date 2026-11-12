import * as THREE from 'three'

export interface CameraSnapshot {
  view_id: string
  position: [number, number, number]
  quaternion: [number, number, number, number]
  fov: number
  aspect: number
  width: number
  height: number
}

export interface SceneCapture {
  snapshot: CameraSnapshot
  image: Blob
}

const tuple3 = (value: THREE.Vector3): [number, number, number] =>
  value.toArray() as [number, number, number]

const tuple4 = (value: THREE.Quaternion): [number, number, number, number] =>
  value.toArray() as [number, number, number, number]

export function createCameraSnapshot(
  camera: THREE.PerspectiveCamera,
  viewId: string,
  width: number,
  height: number,
): CameraSnapshot {
  return {
    view_id: viewId,
    position: tuple3(camera.position),
    quaternion: tuple4(camera.quaternion),
    fov: camera.fov,
    aspect: camera.aspect,
    width,
    height,
  }
}

export function restoreCameraSnapshot(
  camera: THREE.PerspectiveCamera,
  snapshot: CameraSnapshot,
): void {
  camera.position.fromArray(snapshot.position)
  camera.quaternion.fromArray(snapshot.quaternion)
  camera.rotation.order = 'YXZ'
  camera.rotation.setFromQuaternion(camera.quaternion, 'YXZ')
}

function resizeCanvas(source: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create an image capture canvas.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode the scene capture.'))
    }, 'image/png')
  })
}

export async function captureScene(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  viewId: string,
  maxEdge = 1024,
): Promise<SceneCapture> {
  renderer.renderLists.dispose()
  const source = renderer.domElement
  const image = await canvasToBlob(resizeCanvas(source, maxEdge))
  return {
    image,
    snapshot: createCameraSnapshot(camera, viewId, source.width, source.height),
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadSnapshot(snapshot: CameraSnapshot, filename: string): void {
  downloadBlob(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
    filename,
  )
}
