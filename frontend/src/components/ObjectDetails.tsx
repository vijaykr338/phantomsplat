import type { SpatialObjectRecord } from '../lib/spatialData'

interface ObjectDetailsProps {
  object: SpatialObjectRecord | undefined
  onDeselect: () => void
}

export function ObjectDetails({ object, onDeselect }: ObjectDetailsProps) {
  if (!object) return <p className="empty-state">Select an object to inspect its metadata.</p>

  return (
    <div className="object-details">
      <div className="details-heading">
        <div>
          <p className="eyebrow">Selected object</p>
          <h3>{object.label}</h3>
        </div>
        <button type="button" className="reset-button" onClick={onDeselect}>
          Deselect
        </button>
      </div>
      <dl>
        <dt>ID</dt><dd>{object.object_id}</dd>
        <dt>Gaussians</dt><dd>{object.gaussian_count.toLocaleString()}</dd>
        <dt>Centroid</dt><dd>{object.centroid.map((value) => value.toFixed(3)).join(', ')}</dd>
        <dt>Bounds</dt><dd>{object.bbox_min.map((value) => value.toFixed(3)).join(', ')} to {object.bbox_max.map((value) => value.toFixed(3)).join(', ')}</dd>
        <dt>Dimensions</dt><dd>{object.bbox_extent.map((value) => value.toFixed(3)).join(' × ')}</dd>
        <dt>Confidence</dt><dd>{(object.mean_detection_confidence * 100).toFixed(1)}%</dd>
        <dt>Views</dt><dd>{object.observed_views.join(', ') || 'None'}</dd>
      </dl>
      {object.requires_duplicate_review && (
        <p className="warning">
          Duplicate-support review required
          {object.duplicate_support_group_ids.length > 0 &&
            ` (${object.duplicate_support_group_ids.join(', ')})`}
        </p>
      )}
    </div>
  )
}
