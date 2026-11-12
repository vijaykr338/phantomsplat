export type Vec3 = [number, number, number]

export interface SpatialObjectRecord {
  object_id: string
  label: string
  centroid: Vec3
  bbox_min: Vec3
  bbox_max: Vec3
  bbox_extent: Vec3
  gaussian_count: number
  gaussian_ids_file?: string
  observed_views: string[]
  mean_detection_confidence: number
  requires_duplicate_review: boolean
  gaussian_indices: Uint32Array
  binary_offset: number
  duplicate_support_group_ids: string[]
}

export interface SpatialRelationship {
  subject_id: string
  relation: string
  object_id: string
  aabb_gap_distance?: number
}

export interface DuplicateSupportGroup {
  group_id: string
  object_ids: string[]
}

export interface SpatialMetadata {
  scene: string
  coordinate_system: string
  object_count: number
  relationship_count: number
  objects: Omit<SpatialObjectRecord, 'gaussian_indices' | 'binary_offset' | 'duplicate_support_group_ids'>[]
  relationships: SpatialRelationship[]
  duplicate_support_groups?: DuplicateSupportGroup[]
}

export interface LoadedSpatialIndex {
  scene: string
  coordinateSystem: string
  objects: SpatialObjectRecord[]
  relationships: SpatialRelationship[]
  duplicateSupportGroups: DuplicateSupportGroup[]
  totalGaussianSupports: number
  binaryByteLength: number
  sceneGaussianCount?: number
  warnings: string[]
}

export class SpatialDataError extends Error {
  readonly details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = 'SpatialDataError'
    this.details = details
  }
}

export class SpatialDataUnavailableError extends SpatialDataError {
  constructor(message: string) {
    super(message)
    this.name = 'SpatialDataUnavailableError'
  }
}

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((item) => typeof item === 'number' && Number.isFinite(item))

const parseSceneGaussianCount = (header: string): number | undefined => {
  const match = header.match(/element\s+vertex\s+(\d+)/i)
  return match ? Number(match[1]) : undefined
}

async function fetchPlyGaussianCount(url: string): Promise<number | undefined> {
  const response = await fetch(url, { headers: { Range: 'bytes=0-8191' } })
  if (!response.ok) return undefined

  if (!response.body) {
    return parseSceneGaussianCount(await response.text())
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (total < 8192) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      chunks.push(value)
      total += value.byteLength
      const text = new TextDecoder().decode(
        concatenate(chunks, total),
      )
      if (text.includes('end_header')) {
        return parseSceneGaussianCount(text)
      }
    }
  } finally {
    await reader.cancel()
  }

  return parseSceneGaussianCount(
    new TextDecoder().decode(concatenate(chunks, total)),
  )
}

function concatenate(chunks: Uint8Array[], length: number): Uint8Array {
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function validateMetadata(metadata: SpatialMetadata): string[] {
  const errors: string[] = []
  if (!metadata || typeof metadata !== 'object') {
    return ['Metadata is not an object']
  }
  if (!Array.isArray(metadata.objects)) errors.push('Metadata objects is not an array')
  if (!Array.isArray(metadata.relationships)) {
    errors.push('Metadata relationships is not an array')
  }
  if (Array.isArray(metadata.objects) && metadata.object_count !== metadata.objects.length) {
    errors.push(
      `Object count mismatch: declared ${metadata.object_count}, found ${metadata.objects.length}`,
    )
  }
  if (
    Array.isArray(metadata.relationships) &&
    metadata.relationship_count !== metadata.relationships.length
  ) {
    errors.push(
      `Relationship count mismatch: declared ${metadata.relationship_count}, found ${metadata.relationships.length}`,
    )
  }
  return errors
}

export function parseSpatialIndex(
  metadata: SpatialMetadata,
  binary: ArrayBuffer,
  sceneGaussianCount?: number,
): LoadedSpatialIndex {
  const errors = validateMetadata(metadata)
  if (errors.length > 0) throw new SpatialDataError('Invalid spatial metadata', errors)
  if (binary.byteLength % 4 !== 0) {
    throw new SpatialDataError('Invalid Gaussian support binary', [
      `File size ${binary.byteLength} is not divisible by 4`,
    ])
  }

  const duplicateGroups = metadata.duplicate_support_groups ?? []
  const idSet = new Set<string>()
  const duplicateByObject = new Map<string, string[]>()
  for (const group of duplicateGroups) {
    if (!group.group_id || !Array.isArray(group.object_ids)) {
      errors.push('Invalid duplicate support group')
      continue
    }
    for (const objectId of group.object_ids) {
      const groups = duplicateByObject.get(objectId) ?? []
      groups.push(group.group_id)
      duplicateByObject.set(objectId, groups)
    }
  }

  const values = new Uint32Array(binary)
  const objects: SpatialObjectRecord[] = []
  let offset = 0

  // The support file is defined as consecutive segments in metadata object order.
  // Prefix sums below make that assumption explicit and segment boundaries testable.
  for (const [objectIndex, object] of metadata.objects.entries()) {
    if (idSet.has(object.object_id)) errors.push(`Duplicate object ID: ${object.object_id}`)
    idSet.add(object.object_id)

    if (
      !object.object_id ||
      !object.label ||
      !isVec3(object.centroid) ||
      !isVec3(object.bbox_min) ||
      !isVec3(object.bbox_max) ||
      !isVec3(object.bbox_extent) ||
      !Number.isInteger(object.gaussian_count) ||
      object.gaussian_count < 0
    ) {
      errors.push(`Invalid object record at index ${objectIndex}`)
      continue
    }

    const end = offset + object.gaussian_count
    if (end > values.length) {
      errors.push(
        `Truncated segment for ${object.object_id}: [${offset}, ${end}) exceeds ${values.length}`,
      )
      continue
    }

    const indices = values.slice(offset, end)
    if (sceneGaussianCount !== undefined) {
      const invalid = indices.findIndex((index) => index >= sceneGaussianCount)
      if (invalid >= 0) {
        errors.push(
          `Gaussian index ${indices[invalid]} for ${object.object_id} exceeds scene count ${sceneGaussianCount}`,
        )
      }
    }

    objects.push({
      ...object,
      gaussian_indices: indices,
      binary_offset: offset,
      duplicate_support_group_ids: duplicateByObject.get(object.object_id) ?? [],
    })
    offset = end
  }

  if (offset !== values.length) {
    errors.push(`Binary segment total ${offset} does not match ${values.length} uint32 values`)
  }
  const declaredTotal = metadata.objects.reduce(
    (total, object) => total + object.gaussian_count,
    0,
  )
  if (declaredTotal !== values.length) {
    errors.push(
      `Gaussian support count mismatch: metadata ${declaredTotal}, binary ${values.length}`,
    )
  }
  const knownObjectIds = new Set(objects.map((object) => object.object_id))
  for (const [relationshipIndex, relationship] of metadata.relationships.entries()) {
    if (
      !relationship.subject_id ||
      !relationship.object_id ||
      !relationship.relation ||
      !knownObjectIds.has(relationship.subject_id) ||
      !knownObjectIds.has(relationship.object_id)
    ) {
      errors.push(`Invalid relationship at index ${relationshipIndex}`)
    }
  }
  if (errors.length > 0) {
    throw new SpatialDataError('Invalid spatial index', errors)
  }

  const warnings = [
    'Gaussian support segments are interpreted in metadata object order.',
    ...duplicateGroups.map(
      (group) =>
        `${group.group_id} shares Gaussian support across ${group.object_ids.join(', ')}`,
    ),
  ]
  return {
    scene: metadata.scene,
    coordinateSystem: metadata.coordinate_system,
    objects,
    relationships: metadata.relationships,
    duplicateSupportGroups: duplicateGroups,
    totalGaussianSupports: values.length,
    binaryByteLength: binary.byteLength,
    sceneGaussianCount,
    warnings,
  }
}

export async function loadSpatialIndex(
  metadataUrl = '/data/viewer_metadata.json',
  binaryUrl = '/data/gaussian_supports.bin',
  sceneUrl = '/assets/scene.ply',
): Promise<LoadedSpatialIndex> {
  const [metadataResponse, binaryResponse, sceneGaussianCount] = await Promise.all([
    fetch(metadataUrl),
    fetch(binaryUrl),
    fetchPlyGaussianCount(sceneUrl).catch(() => undefined),
  ])
  if (!metadataResponse.ok) {
    if (metadataResponse.status === 404) {
      throw new SpatialDataUnavailableError('Spatial index metadata was not found.')
    }
    throw new SpatialDataError(`Unable to load metadata (HTTP ${metadataResponse.status})`)
  }
  if (!binaryResponse.ok) {
    if (binaryResponse.status === 404) {
      throw new SpatialDataUnavailableError('Spatial index support data was not found.')
    }
    throw new SpatialDataError(
      `Unable to load Gaussian supports (HTTP ${binaryResponse.status})`,
    )
  }
  const metadataContentType = metadataResponse.headers.get('content-type') ?? ''
  const binaryContentType = binaryResponse.headers.get('content-type') ?? ''
  if (metadataContentType.includes('text/html') || binaryContentType.includes('text/html')) {
    throw new SpatialDataUnavailableError(
      'Spatial index data is not configured. Add viewer_metadata.json and gaussian_supports.bin under frontend/public/data.',
    )
  }

  let metadata: SpatialMetadata
  try {
    const metadataText = await metadataResponse.text()
    if (metadataText.trimStart().startsWith('<')) {
      throw new SpatialDataUnavailableError(
        'Spatial index data is not configured. Add viewer_metadata.json and gaussian_supports.bin under frontend/public/data.',
      )
    }
    metadata = JSON.parse(metadataText) as SpatialMetadata
  } catch (error: unknown) {
    if (error instanceof SpatialDataUnavailableError) throw error
    throw new SpatialDataError('Metadata is not valid JSON')
  }
  return parseSpatialIndex(metadata, await binaryResponse.arrayBuffer(), sceneGaussianCount)
}
