import { SPLAT_ROTATION_X } from '../../sceneTransform'
import { loadGroundTruthReport } from '../../ground-truth/groundTruthLoader'
import { buildSceneCatalog, type StructureData } from './buildScene'
import type { SceneCatalog } from './types'

export async function loadSceneCatalog(
  labelsUrl = '/assets/labels.json',
  structureUrl = '/assets/structure.json',
  rotationX = SPLAT_ROTATION_X,
): Promise<SceneCatalog> {
  const [report, structureResponse] = await Promise.all([
    loadGroundTruthReport(labelsUrl),
    fetch(structureUrl),
  ])
  if (!structureResponse.ok) {
    throw new Error(`Unable to load structure data (HTTP ${structureResponse.status}).`)
  }
  const structure: unknown = await structureResponse.json()
  if (!structure || typeof structure !== 'object') {
    throw new Error('Structure data must be a JSON object.')
  }
  const catalog = buildSceneCatalog(report.records, structure as StructureData, rotationX)
  catalog.warnings.unshift(
    `Ingested ${catalog.objects.length} objects; skipped ${report.skippedRoomRecords} room record and ${report.invalidRecords} malformed records.`,
  )
  return catalog
}
