export interface SceneAsset {
  id: string
  label: string
  plyUrl: string
  previewUrl: string
  labelsUrl: string
  structureUrl: string
}

const sceneIds = [
  '0001_839920',
  '0002_839955',
  '0003_839989',
  '0004_840011',
  '0005_840050',
  '0006_840125',
  '0007_840137',
  '0008_840170',
  '0009_840175',
  '0010_840154',
  '0011_840866',
  '0012_840878',
  '0013_840910',
  '0014_841007',
  '0015_840888',
] as const

export const sceneAssets: SceneAsset[] = sceneIds.map((id) => ({
  id,
  label: `Scene ${id.slice(0, 4)}`,
  plyUrl: `/assets/${id}/3dgs_compressed.ply`,
  previewUrl: `/assets/${id}/occupancy.png`,
  labelsUrl: `/assets/${id}/labels.json`,
  structureUrl: `/assets/${id}/structure.json`,
}))
