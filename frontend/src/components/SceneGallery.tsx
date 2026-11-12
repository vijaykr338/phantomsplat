import type { SceneAsset } from '../sceneAssets'

interface SceneGalleryProps {
  assets: SceneAsset[]
  selectedId: string
  open: boolean
  onToggle: () => void
  onSelect: (asset: SceneAsset) => void
}

export function SceneGallery({ assets, selectedId, open, onToggle, onSelect }: SceneGalleryProps) {
  return (
    <section className={`scene-gallery glass${open ? ' open' : ''}`} aria-label="Choose a 3DGS scene">
      <button type="button" className="gallery-toggle" onClick={onToggle} aria-expanded={open}>
        <span>
          <span className="section-label">Scene library</span>
          <strong>Choose a 3DGS file</strong>
        </span>
        <span className="gallery-count">{assets.length} assets <span aria-hidden="true">{open ? '−' : '+'}</span></span>
      </button>
      {open && (
        <div className="gallery-grid">
          {assets.map((asset) => (
            <button
              type="button"
              className={`scene-card${asset.id === selectedId ? ' selected' : ''}`}
              key={asset.id}
              onClick={() => onSelect(asset)}
              aria-pressed={asset.id === selectedId}
            >
              <img src={asset.previewUrl} alt="" loading="lazy" />
              <span>{asset.label}</span>
              <small>{asset.id}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
