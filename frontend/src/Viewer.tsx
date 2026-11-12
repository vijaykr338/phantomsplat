import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { anchors } from './anchors'
import { SPLAT_ROTATION_X } from './sceneTransform'
import { ObjectExplorer } from './components/ObjectExplorer'
import { RegistrationToolbar } from './components/RegistrationToolbar'
import { GroundTruthPanel } from './ground-truth/GroundTruthPanel'
import { rebuildGroundTruthOverlay } from './ground-truth/GroundTruthOverlay'
import { loadGroundTruth } from './ground-truth/groundTruthLoader'
import type { GroundTruthAnnotation } from './ground-truth/types'
import { loadSceneCatalog } from './engine/ingest/sceneCatalog'
import { catalogJson } from './engine/ingest/buildScene'
import type { SceneCatalog } from './engine/ingest/types'
import type { LoadedSpatialIndex } from './lib/spatialData'
import { createSpatialObject, loadObjects, saveObjects } from './spatial/objectStore'
import type { SpatialObject } from './spatial/objectTypes'
import type { QueryResponse } from './api/ragApi'
import { captureScene, downloadBlob, downloadSnapshot, restoreCameraSnapshot, type CameraSnapshot } from './viewer/captureViews'
import { useViewerEngine, MAX_PITCH } from './hooks/useViewerEngine'
import { ControlsGuide } from './components/ControlsGuide'
import { RightSettingsSidebar } from './components/RightSettingsSidebar'
import { SpatialRagChat } from './components/SpatialRagChat'
import { TopNav } from './components/TopNav'
import { SceneGallery } from './components/SceneGallery'
import { sceneAssets } from './sceneAssets'
import './viewer.css'

const ORIENTATIONS = [
  { label: 'Y-down (COLMAP) · 180°', value: Math.PI },
  { label: 'Z-up · −90°', value: -Math.PI / 2 },
  { label: 'Z-down · +90°', value: Math.PI / 2 },
  { label: 'Already Y-up · 0°', value: 0 },
]

export function Viewer() {
  const placementLabelRef = useRef<string | null>(null)
  const groundTruthVisibleRef = useRef(false)
  const highlightedSplatsRef = useRef(new Map<number, ReturnType<NonNullable<import('@sparkjsdev/spark').SplatMesh['packedSplats']>['getSplat']>>())
  const [status, setStatus] = useState('Loading scene…')
  const [rotationX, setRotationX] = useState(SPLAT_ROTATION_X)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [spatialIndex] = useState<LoadedSpatialIndex | null>(null)
  const [spatialError, setSpatialError] = useState<string | null>(null)
  const [splatReady, setSplatReady] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [registeredObjects, setRegisteredObjects] = useState<SpatialObject[]>(() => loadObjects())
  const [selectedRegisteredObjectId, setSelectedRegisteredObjectId] = useState<string | null>(null)
  const [placementLabel, setPlacementLabel] = useState<string | null>(null)
  const [captures, setCaptures] = useState<CameraSnapshot[]>([])
  const [captureBusy, setCaptureBusy] = useState(false)
  const [groundTruth, setGroundTruth] = useState<GroundTruthAnnotation[]>([])
  const [groundTruthVisible, setGroundTruthVisible] = useState(false)
  const [selectedGroundTruthId, setSelectedGroundTruthId] = useState<string | null>(null)
  const [selectedGroundTruthAnchorId, setSelectedGroundTruthAnchorId] = useState<string | null>(null)
  const [sceneCatalog, setSceneCatalog] = useState<SceneCatalog | null>(null)
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null)
  const [selectedSceneId, setSelectedSceneId] = useState(sceneAssets[0].id)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const selectedScene = sceneAssets.find((asset) => asset.id === selectedSceneId) ?? sceneAssets[0]

  const {
    containerRef,
    cameraRef,
    rendererRef,
    splatRef,
    objectPointsGroupRef,
    registeredMarkersGroupRef,
    groundTruthGroupRef,
    lookRef,
    flyToRef,
    resetViewRef,
  } = useViewerEngine({
    sceneUrl: selectedScene.plyUrl,
    rotationX,
    placementLabelRef,
    groundTruthVisibleRef,
    onPlace: (position, label) => {
      setRegisteredObjects((current) => [...current, createSpatialObject(label, position, current)])
      setPlacementLabel(null)
      setStatus(`Registered ${label}`)
    },
    onGroundTruthSelect: setSelectedGroundTruthId,
    onStatus: setStatus,
    onSplatReady: () => setSplatReady(true),
  })

  useEffect(() => { placementLabelRef.current = placementLabel }, [placementLabel])
  useEffect(() => { groundTruthVisibleRef.current = groundTruthVisible }, [groundTruthVisible])

  useEffect(() => {
    let cancelled = false
    loadGroundTruth(selectedScene.labelsUrl, rotationX).then((items) => {
      if (!cancelled) setGroundTruth(items)
    }).catch((error: unknown) => {
      if (!cancelled) {
        setSpatialError(error instanceof Error ? error.message : 'Unable to load ground truth.')
        console.error('Failed to load ground truth:', error)
      }
    })
    return () => { cancelled = true }
  }, [rotationX, selectedScene.labelsUrl])

  useEffect(() => {
    let cancelled = false
    loadSceneCatalog(selectedScene.labelsUrl, selectedScene.structureUrl, rotationX).then((catalog) => {
      if (!cancelled) setSceneCatalog(catalog)
    }).catch((error: unknown) => {
      if (!cancelled) {
        setSpatialError(error instanceof Error ? error.message : 'Unable to build scene catalogue.')
        console.error('Failed to build scene catalogue:', error)
      }
    })
    return () => { cancelled = true }
  }, [rotationX, selectedScene.labelsUrl, selectedScene.structureUrl])

  useEffect(() => {
    try { saveObjects(registeredObjects) }
    catch (error) { setSpatialError(error instanceof Error ? error.message : 'Unable to save objects.') }
  }, [registeredObjects])

  useEffect(() => {
    if (splatRef.current) splatRef.current.rotation.x = rotationX
    if (objectPointsGroupRef.current) objectPointsGroupRef.current.rotation.x = rotationX
  }, [rotationX, objectPointsGroupRef, splatRef])

  useEffect(() => {
    let cancelled = false
    const applySelection = async () => {
      const splat = splatRef.current
      const overlay = objectPointsGroupRef.current
      if (!splat || !spatialIndex) return
      await splat.initialized
      if (cancelled || !overlay || !splat.packedSplats) return
      const packed = splat.packedSplats
      for (const [index, original] of highlightedSplatsRef.current) {
        packed.setSplat(index, original.center, original.scales, original.quaternion, original.opacity, original.color)
      }
      highlightedSplatsRef.current.clear()
      overlay.clear()
      if (!selectedObjectId) {
        packed.needsUpdate = true
        splat.updateVersion()
        return
      }
      const object = spatialIndex.objects.find((item) => item.object_id === selectedObjectId)
      if (!object) return
      const color = new THREE.Color(0.3, 1, 0.1)
      const positions = new Float32Array(object.gaussian_indices.length * 3)
      object.gaussian_indices.forEach((index, pointIndex) => {
        if (index >= packed.getNumSplats()) return
        const original = packed.getSplat(index)
        highlightedSplatsRef.current.set(index, {
          center: original.center.clone(), scales: original.scales.clone(), quaternion: original.quaternion.clone(),
          opacity: original.opacity, color: original.color.clone(),
        })
        packed.setSplat(index, original.center, original.scales, original.quaternion, Math.min(1, original.opacity * 1.35), color)
        positions.set([original.center.x, original.center.y, original.center.z], pointIndex * 3)
      })
      packed.needsUpdate = true
      splat.updateVersion()
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.018, sizeAttenuation: true, transparent: true, opacity: 0.35, depthTest: true, depthWrite: false }))
      points.name = selectedObjectId
      points.renderOrder = 10
      overlay.add(points)
      setStatus(`Highlighted ${object.label} (${object.gaussian_count.toLocaleString()} splats)`)
    }
    void applySelection()
    return () => { cancelled = true }
  }, [selectedObjectId, spatialIndex, splatReady, objectPointsGroupRef, splatRef])

  useEffect(() => {
    const group = registeredMarkersGroupRef.current
    if (!group) return
    group.clear()
    registeredObjects.forEach((object) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: object.object_id === selectedRegisteredObjectId ? '#fef08a' : object.verified ? '#86efac' : '#c084fc', depthTest: false, transparent: true, opacity: 0.95 }))
      marker.position.set(...object.position)
      marker.renderOrder = 20
      group.add(marker)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 64
      const context = canvas.getContext('2d')
      if (!context) return
      context.font = '600 26px Inter, sans-serif'
      context.fillStyle = '#f5f7ff'
      context.fillText(object.label, 8, 38)
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }))
      label.position.set(object.position[0], object.position[1] + 0.16, object.position[2])
      label.scale.set(0.8, 0.2, 1)
      label.renderOrder = 21
      group.add(label)
    })
  }, [registeredObjects, selectedRegisteredObjectId, registeredMarkersGroupRef])

  useEffect(() => {
    const group = groundTruthGroupRef.current
    if (!group) return
    rebuildGroundTruthOverlay({ group, annotations: groundTruthVisible ? groundTruth : [], selectedId: selectedGroundTruthId, highlightedIds: new Set(queryResponse?.results.map((item) => item.object_id) ?? []), onSelect: setSelectedGroundTruthId })
  }, [groundTruth, groundTruthVisible, selectedGroundTruthId, queryResponse, groundTruthGroupRef])

  const flyToAnnotation = (annotation: GroundTruthAnnotation) => {
    setSelectedGroundTruthId(annotation.id)
    void flyToRef.current?.({ id: `ground-truth-${annotation.id}`, name: `${annotation.label} #${annotation.id}`, position: [annotation.center[0], annotation.center[1] + Math.max(annotation.dimensions[1], 0.65), annotation.center[2] + Math.max(annotation.dimensions[2], 1.2)], target: annotation.center })
  }
  const applyQueryResults = (response: QueryResponse) => {
    setQueryResponse(response)
    const annotation = groundTruth.find((item) => item.id === response.results[0]?.object_id)
    if (annotation) flyToAnnotation(annotation)
  }
  const exportRegisteredObjects = () => {
    const blob = new Blob([JSON.stringify({ schema_version: 1, scene_id: 'living_room_001', coordinate_space: 'viewer_world_v1', reference_frame: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, objects: registeredObjects }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'objects.json'
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Exported registered objects')
  }
  const captureCurrentView = async () => {
    if (!rendererRef.current || !cameraRef.current) return setSpatialError('The viewer is not ready to capture a view.')
    setCaptureBusy(true)
    try {
      const capture = await captureScene(rendererRef.current, cameraRef.current, `view-${captures.length + 1}`)
      setCaptures((current) => [...current, capture.snapshot])
      const base = `capture-${String(captures.length + 1).padStart(2, '0')}-${capture.snapshot.view_id}`
      downloadBlob(capture.image, `${base}.png`)
      downloadSnapshot(capture.snapshot, `${base}.json`)
      setStatus(`Captured ${capture.snapshot.view_id}`)
    } catch (error) { setSpatialError(error instanceof Error ? error.message : 'Unable to capture the view.') }
    finally { setCaptureBusy(false) }
  }
  const captureSavedViews = async () => {
    if (!rendererRef.current || !cameraRef.current || !flyToRef.current) return setSpatialError('The viewer is not ready to capture saved views.')
    setCaptureBusy(true)
    try {
      for (const [index, anchor] of anchors.entries()) {
        await flyToRef.current(anchor)
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const capture = await captureScene(rendererRef.current!, cameraRef.current!, anchor.id)
        setCaptures((current) => [...current, capture.snapshot])
        const base = `capture-${String(index + 1).padStart(2, '0')}-${anchor.id}`
        downloadBlob(capture.image, `${base}.png`)
        downloadSnapshot(capture.snapshot, `${base}.json`)
      }
      setStatus(`Captured ${anchors.length} saved views`)
    } catch (error) { setSpatialError(error instanceof Error ? error.message : 'Unable to capture saved views.') }
    finally { setCaptureBusy(false) }
  }
  const restoreSnapshot = (snapshot: CameraSnapshot) => {
    if (!cameraRef.current) return
    restoreCameraSnapshot(cameraRef.current, snapshot)
    lookRef.current = { yaw: cameraRef.current.rotation.y, pitch: THREE.MathUtils.clamp(cameraRef.current.rotation.x, -MAX_PITCH, MAX_PITCH) }
    setStatus(`Restored ${snapshot.view_id}`)
  }
  const logView = () => {
    if (!cameraRef.current) return
    const forward = new THREE.Vector3()
    cameraRef.current.getWorldDirection(forward)
    const target = cameraRef.current.position.clone().add(forward)
    const round = (value: THREE.Vector3) => value.toArray().map((item) => Number(item.toFixed(5)))
    console.log('Anchor (viewer space):', JSON.stringify({ id: 'view', name: 'New view', position: round(cameraRef.current.position), target: round(target) }, null, 2))
    setStatus('Logged new view to the console')
  }
  const exportSceneCatalog = () => {
    if (!sceneCatalog) return setSpatialError('The processed scene catalogue is not ready.')
    downloadBlob(new Blob([catalogJson(sceneCatalog)], { type: 'application/json' }), 'scene-catalog.json')
    setStatus(`Exported ${sceneCatalog.objects.length} catalogue objects`)
  }
  const selectScene = (scene: typeof selectedScene) => {
    if (scene.id === selectedSceneId) {
      setGalleryOpen(false)
      return
    }
    setSplatReady(false)
    setSelectedObjectId(null)
    setGroundTruth([])
    setSceneCatalog(null)
    setSelectedGroundTruthId(null)
    setSelectedGroundTruthAnchorId(null)
    setSpatialError(null)
    setSelectedSceneId(scene.id)
    setGalleryOpen(false)
    setStatus(`Loading ${scene.label}…`)
  }

  return (
    <main className="viewer-shell">
      <div ref={containerRef} className="viewer-canvas" />
      <div className="hud-layer">
        <TopNav status={status} ready={splatReady} onReset={() => resetViewRef.current?.()} />
        <SceneGallery assets={sceneAssets} selectedId={selectedSceneId} open={galleryOpen} onToggle={() => setGalleryOpen((value) => !value)} onSelect={selectScene} />
        <div className="hud-main">
          <section className="left-dock">
            {spatialIndex && <ObjectExplorer index={spatialIndex} selectedObjectId={selectedObjectId} onSelect={(id) => { setSelectedObjectId(id); if (!id) setStatus('Ready') }} />}
            {groundTruth.length > 0 && <GroundTruthPanel annotations={groundTruth} selectedId={selectedGroundTruthId} selectedAnchorId={selectedGroundTruthAnchorId} registeredObjects={registeredObjects} visible={groundTruthVisible} onVisibleChange={setGroundTruthVisible} onSelect={setSelectedGroundTruthId} onSelectAnchor={setSelectedGroundTruthAnchorId} onFocus={flyToAnnotation} onExportCatalog={exportSceneCatalog} />}
          </section>
          <section className="center-stage" aria-label="3D scene" />
          <section className="right-dock">
            <RightSettingsSidebar anchors={anchors} open={panelOpen} captures={captures} captureBusy={captureBusy} rotationX={rotationX} orientations={ORIENTATIONS} onToggle={() => setPanelOpen((value) => !value)} onFlyTo={(anchor) => void flyToRef.current?.(anchor)} onLogView={logView} onRotationChange={setRotationX} onCaptureCurrent={() => void captureCurrentView()} onCaptureSaved={() => void captureSavedViews()} onRestore={restoreSnapshot} />
          </section>
        </div>
        <div className="bottom-bar">
          <ControlsGuide />
          <RegistrationToolbar objects={registeredObjects} selectedObjectId={selectedRegisteredObjectId} onBeginPlacement={(label) => { const normalized = label.trim().toLowerCase(); setPlacementLabel(normalized); setStatus(`Click the floor to place ${normalized}`) }} onFocus={(object) => { setSelectedRegisteredObjectId(object.object_id); void flyToRef.current?.({ id: object.object_id, name: object.label, position: [object.position[0], object.position[1] + 0.65, object.position[2] + 1.2], target: object.position }) }} onExport={exportRegisteredObjects} />
          <SpatialRagChat selectedObjectId={selectedGroundTruthId} onResults={applyQueryResults} />
        </div>
        <div className="toast-stack">
          {spatialError && <div className="toast error glass" role="alert">Spatial index unavailable: {spatialError}</div>}
          {placementLabel && <div className="placement-hint glass" role="status">Click the floor to place <strong>{placementLabel}</strong><button type="button" className="icon-btn" onClick={() => setPlacementLabel(null)} aria-label="Cancel placement">×</button></div>}
        </div>
      </div>
    </main>
  )
}
