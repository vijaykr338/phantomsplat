import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import type { Anchor } from '../anchors'

export const MAX_PITCH = THREE.MathUtils.degToRad(85)
export const START_POSITION = new THREE.Vector3(0, 1.6, 9.5)
export const START_TARGET = new THREE.Vector3(0, 1.4, 10.5)

export const lookAnglesFrom = (from: THREE.Vector3, to: THREE.Vector3) => {
  const d = to.clone().sub(from)
  const len = d.length() || 1
  return {
    yaw: Math.atan2(-d.x, -d.z),
    pitch: Math.asin(THREE.MathUtils.clamp(d.y / len, -1, 1)),
  }
}

interface UseViewerEngineOptions {
  sceneUrl: string
  rotationX: number
  placementLabelRef: MutableRefObject<string | null>
  groundTruthVisibleRef: MutableRefObject<boolean>
  onPlace: (position: [number, number, number], label: string) => void
  onGroundTruthSelect: (id: string) => void
  onStatus: (status: string) => void
  onSplatReady: () => void
}

export function useViewerEngine({
  sceneUrl,
  rotationX,
  placementLabelRef,
  groundTruthVisibleRef,
  onPlace,
  onGroundTruthSelect,
  onStatus,
  onSplatReady,
}: UseViewerEngineOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const splatRef = useRef<SplatMesh | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const objectPointsGroupRef = useRef<THREE.Group | null>(null)
  const registeredMarkersGroupRef = useRef<THREE.Group | null>(null)
  const groundTruthGroupRef = useRef<THREE.Group | null>(null)
  const lookRef = useRef({ yaw: 0, pitch: 0 })
  const flyToRef = useRef<((anchor: Anchor) => Promise<void>) | null>(null)
  const resetViewRef = useRef<(() => void) | null>(null)

  const callbacksRef = useRef({ onPlace, onGroundTruthSelect, onStatus, onSplatReady })
  useEffect(() => {
    callbacksRef.current = { onPlace, onGroundTruthSelect, onStatus, onSplatReady }
  }, [onGroundTruthSelect, onPlace, onSplatReady, onStatus])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#101218')
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
    camera.rotation.order = 'YXZ'
    camera.position.copy(START_POSITION)
    cameraRef.current = camera
    lookRef.current = lookAnglesFrom(START_POSITION, START_TARGET)

    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.touchAction = 'none'
    renderer.domElement.style.cursor = 'grab'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    scene.add(new SparkRenderer({ renderer }))
    const splat = new SplatMesh({
      url: sceneUrl,
      onLoad: () => {
        callbacksRef.current.onSplatReady()
        callbacksRef.current.onStatus('Ready')
      },
    })
    splat.rotation.x = rotationX
    scene.add(splat)
    splatRef.current = splat

    const objectPointsGroup = new THREE.Group()
    objectPointsGroup.rotation.x = rotationX
    scene.add(objectPointsGroup)
    objectPointsGroupRef.current = objectPointsGroup

    const registeredMarkersGroup = new THREE.Group()
    scene.add(registeredMarkersGroup)
    registeredMarkersGroupRef.current = registeredMarkersGroup

    const groundTruthGroup = new THREE.Group()
    scene.add(groundTruthGroup)
    groundTruthGroupRef.current = groundTruthGroup

    const el = renderer.domElement
    let dragging = false
    const onPointerDown = (event: PointerEvent) => {
      const label = placementLabelRef.current
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, camera)

      if (label) {
        const hit = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) {
          callbacksRef.current.onPlace(hit.toArray() as [number, number, number], label)
        }
        return
      }

      if (groundTruthVisibleRef.current) {
        const hit = raycaster.intersectObjects(groundTruthGroup.children, true)[0]
        const id = hit?.object.userData.groundTruthId
        if (typeof id === 'string') {
          callbacksRef.current.onGroundTruthSelect(id)
          callbacksRef.current.onStatus(`Selected ground truth #${id}`)
          return
        }
      }

      dragging = true
      el.setPointerCapture(event.pointerId)
      el.style.cursor = 'grabbing'
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return
      lookRef.current.yaw -= event.movementX * 0.003
      lookRef.current.pitch = THREE.MathUtils.clamp(
        lookRef.current.pitch - event.movementY * 0.003,
        -MAX_PITCH,
        MAX_PITCH,
      )
    }
    const onPointerUp = (event: PointerEvent) => {
      dragging = false
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
      el.style.cursor = 'grab'
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      camera.position.addScaledVector(forward, -event.deltaY * 0.002)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    const pressedKeys = new Set<string>()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) return
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        event.preventDefault()
        pressedKeys.add(key)
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.key.toLowerCase())
    const handleWindowBlur = () => pressedKeys.clear()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleWindowBlur)

    let flyToFrame: number | null = null
    const resetView = () => {
      if (flyToFrame !== null) cancelAnimationFrame(flyToFrame)
      flyToFrame = null
      camera.position.copy(START_POSITION)
      lookRef.current = lookAnglesFrom(START_POSITION, START_TARGET)
      callbacksRef.current.onStatus('Ready')
    }
    resetViewRef.current = resetView

    const flyTo = (anchor: Anchor): Promise<void> => new Promise((resolve) => {
      if (flyToFrame !== null) cancelAnimationFrame(flyToFrame)
      const fromPos = camera.position.clone()
      const toPos = new THREE.Vector3(...anchor.position)
      const from = { ...lookRef.current }
      const to = lookAnglesFrom(toPos, new THREE.Vector3(...anchor.target))
      const yawDelta = Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw))
      const startedAt = performance.now()
      callbacksRef.current.onStatus(`Flying to ${anchor.name}…`)

      const animate = (now: number) => {
        const p = Math.min((now - startedAt) / 900, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        camera.position.lerpVectors(fromPos, toPos, eased)
        lookRef.current.yaw = from.yaw + yawDelta * eased
        lookRef.current.pitch = THREE.MathUtils.clamp(
          from.pitch + (to.pitch - from.pitch) * eased,
          -MAX_PITCH,
          MAX_PITCH,
        )
        if (p < 1) flyToFrame = requestAnimationFrame(animate)
        else {
          flyToFrame = null
          callbacksRef.current.onStatus(`Viewing ${anchor.name}`)
          resolve()
        }
      }
      flyToFrame = requestAnimationFrame(animate)
    })
    flyToRef.current = flyTo

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight, false)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    renderer.setAnimationLoop(() => {
      const { yaw, pitch } = lookRef.current
      camera.rotation.set(pitch, yaw, 0)
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      const movement = new THREE.Vector3()
      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) movement.add(forward)
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) movement.sub(forward)
      if (pressedKeys.has('d') || pressedKeys.has('arrowright')) movement.add(right)
      if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) movement.sub(right)
      if (pressedKeys.has('e')) movement.y += 1
      if (pressedKeys.has('q')) movement.y -= 1
      if (movement.lengthSq() > 0) {
        movement.normalize().multiplyScalar(0.03 * (pressedKeys.has('shift') ? 3 : 1))
        camera.position.add(movement)
      }
      renderer.render(scene, camera)
    })
    splat.initialized.catch(() => callbacksRef.current.onStatus('Unable to load scene'))

    return () => {
      resizeObserver.disconnect()
      if (flyToFrame !== null) cancelAnimationFrame(flyToFrame)
      renderer.setAnimationLoop(null)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('wheel', onWheel)
      splat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      cameraRef.current = null
      rendererRef.current = null
      splatRef.current = null
      sceneRef.current = null
      objectPointsGroupRef.current = null
      registeredMarkersGroupRef.current = null
      groundTruthGroupRef.current = null
      flyToRef.current = null
      resetViewRef.current = null
    }
  }, [sceneUrl])

  return {
    containerRef,
    cameraRef,
    rendererRef,
    splatRef,
    sceneRef,
    objectPointsGroupRef,
    registeredMarkersGroupRef,
    groundTruthGroupRef,
    lookRef,
    flyToRef,
    resetViewRef,
  }
}
