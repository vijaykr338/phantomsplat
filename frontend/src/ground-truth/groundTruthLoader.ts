import { annotationFromRecord } from './boundingBoxUtils'
import type { GroundTruthAnnotation, GroundTruthRecord } from './types'
import type { GroundTruthLoadReport } from '../engine/ingest/types'

const isPoint = (value: unknown): value is GroundTruthRecord['bounding_box'][number] => {
  if (!value || typeof value !== 'object') return false
  const point = value as Partial<GroundTruthRecord['bounding_box'][number]>
  return [point.x, point.y, point.z].every(
    (item) => typeof item === 'number' && Number.isFinite(item),
  )
}

const isRecord = (value: unknown): value is GroundTruthRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<GroundTruthRecord>
  return (
    typeof record.ins_id === 'string' &&
    typeof record.label === 'string' &&
    Array.isArray(record.bounding_box) &&
    record.bounding_box.length === 8 &&
    record.bounding_box.every(isPoint)
  )
}

export async function loadGroundTruth(
  url = '/assets/labels.json',
  rotationX: number,
): Promise<GroundTruthAnnotation[]> {
  const report = await loadGroundTruthReport(url)
  return report.records.map((record) => annotationFromRecord(record, rotationX))
}

export async function loadGroundTruthReport(
  url = '/assets/labels.json',
): Promise<GroundTruthLoadReport> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load ground truth (HTTP ${response.status}).`)
  const parsed: unknown = await response.json()
  if (!Array.isArray(parsed)) throw new Error('Ground truth must be a JSON array.')
  const validRecords = parsed.filter(isRecord)
  const knownRoomRecordCount = parsed.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const record = item as Partial<GroundTruthRecord>
    return record.ins_id === '' && record.label?.trim().toLowerCase() === 'room'
  }).length
  const invalidCount = parsed.length - validRecords.length - knownRoomRecordCount
  if (invalidCount > 0) console.warn(`Skipped ${invalidCount} malformed ground-truth annotations.`)
  if (validRecords.length === 0) {
    throw new Error('Ground truth contains no valid annotations.')
  }
  return {
    records: validRecords,
    skippedRoomRecords: knownRoomRecordCount,
    invalidRecords: invalidCount,
  }
}
