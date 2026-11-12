import { useMemo, useState } from 'react'
import type { SpatialObject } from '../spatial/objectTypes'
import { compareAnchor, sameLabelCandidates } from './groundTruthComparison'
import type { GroundTruthAnnotation } from './types'

interface GroundTruthPanelProps {
  annotations: GroundTruthAnnotation[]
  selectedId: string | null
  selectedAnchorId: string | null
  registeredObjects: SpatialObject[]
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  onSelect: (id: string | null) => void
  onSelectAnchor: (id: string | null) => void
  onFocus: (annotation: GroundTruthAnnotation) => void
  onExportCatalog: () => void
}

export function GroundTruthPanel(props: GroundTruthPanelProps) {
  const [search, setSearch] = useState('')
  const [label, setLabel] = useState('all')
  const labels = useMemo(
    () => [...new Set(props.annotations.map((annotation) => annotation.label))].sort(),
    [props.annotations],
  )
  const filtered = props.annotations.filter((annotation) =>
    (label === 'all' || annotation.label === label) &&
    `${annotation.label} ${annotation.id}`.includes(search.toLowerCase()),
  )
  const selected = props.annotations.find((annotation) => annotation.id === props.selectedId)
  const selectedAnchor = props.registeredObjects.find(
    (object) => object.object_id === props.selectedAnchorId,
  )
  const matches = selectedAnchor ? sameLabelCandidates(selectedAnchor, props.annotations) : []

  return (
    <aside className="ground-truth-panel glass">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Debug mode</p>
          <h2>Ground truth <span className="count">{props.annotations.length}</span></h2>
        </div>
        <label className="ground-truth-toggle">
          <input
            type="checkbox"
            checked={props.visible}
            onChange={(event) => props.onVisibleChange(event.target.checked)}
          />
          Show
        </label>
      </div>
      <div className="ground-truth-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value.toLowerCase())}
          placeholder="Search label or ID"
          aria-label="Search ground truth"
        />
        <select value={label} onChange={(event) => setLabel(event.target.value)}>
          <option value="all">All labels</option>
          {labels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <button type="button" className="btn block" onClick={props.onExportCatalog}>
        Export processed catalogue
      </button>
      {props.visible && (
        <div className="ground-truth-list">
          {filtered.map((annotation) => (
            <button
              type="button"
              className={`ground-truth-row${annotation.id === props.selectedId ? ' selected' : ''}`}
              key={annotation.id}
              onClick={() => {
                props.onSelect(annotation.id)
                props.onFocus(annotation)
              }}
            >
              <span>{annotation.label}</span>
              <small>#{annotation.id}</small>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="ground-truth-details">
          <strong>{selected.label} · #{selected.id}</strong>
          <span>Centre: {selected.center.map((value) => value.toFixed(2)).join(', ')}</span>
          <span>Size: {selected.dimensions.map((value) => value.toFixed(2)).join(' × ')}</span>
        </div>
      )}
      {props.registeredObjects.length > 0 && (
        <div className="ground-truth-compare">
          <p className="section-label">Compare anchor</p>
          <select
            value={props.selectedAnchorId ?? ''}
            onChange={(event) => props.onSelectAnchor(event.target.value || null)}
          >
            <option value="">Select registered object</option>
            {props.registeredObjects.map((object) => (
              <option key={object.object_id} value={object.object_id}>
                {object.label} · {object.object_id}
              </option>
            ))}
          </select>
          {selectedAnchor && (
            <select
              value={props.selectedId ?? ''}
              onChange={(event) => props.onSelect(event.target.value || null)}
            >
              <option value="">Select matching annotation</option>
              {matches.map((annotation) => (
                <option key={annotation.id} value={annotation.id}>
                  {annotation.label} · #{annotation.id}
                </option>
              ))}
            </select>
          )}
          {selectedAnchor && selected && selected.label === selectedAnchor.label.toLowerCase() && (
            <strong className="anchor-error">
              Error: {compareAnchor(selectedAnchor, selected).toFixed(3)} m
            </strong>
          )}
        </div>
      )}
    </aside>
  )
}
