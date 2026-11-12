import { useMemo, useState, type FormEvent } from 'react'
import type { LoadedSpatialIndex, SpatialObjectRecord } from '../lib/spatialData'
import { executeSpatialQuery, getRelatedObjects, getRelationshipsForObject } from '../lib/spatialQueries'
import { ObjectDetails } from './ObjectDetails'

interface ObjectExplorerProps {
  index: LoadedSpatialIndex
  selectedObjectId: string | null
  onSelect: (objectId: string | null) => void
}

export function ObjectExplorer({ index, selectedObjectId, onSelect }: ObjectExplorerProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null)
  const selected = index.objects.find((object) => object.object_id === selectedObjectId)
  const categories = useMemo(
    () => [...new Set(index.objects.map((object) => object.label))].sort(),
    [index.objects],
  )
  const filtered = index.objects.filter((object) => {
    const matchesSearch =
      object.label.toLowerCase().includes(search.toLowerCase()) ||
      object.object_id.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (category === 'all' || object.label === category)
  })
  const nearby = selected ? getRelatedObjects(index, selected.object_id) : []
  const relationships = selected ? getRelationshipsForObject(index, selected.object_id) : []

  const runQuery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = executeSpatialQuery(index, query)
    setQueryAnswer(result.answer)
    if (result.objects.length === 1) onSelect(result.objects[0].object_id)
  }

  return (
    <aside className="object-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">SpatialRAG index</p>
          <h2>Objects <span className="count">{index.objects.length}</span></h2>
        </div>
        <span className="viewer-badge">Indexed splats</span>
      </div>
      <div className="object-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search objects"
          aria-label="Search objects"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <form className="spatial-query" onSubmit={runQuery}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask: what is near the sofa?"
          aria-label="Spatial query"
        />
        <button type="submit" className="query-button">Ask</button>
      </form>
      {queryAnswer && <p className="query-answer">{queryAnswer}</p>}
      <div className="object-list">
        {filtered.map((object: SpatialObjectRecord) => (
          <button
            type="button"
            className={`object-row${object.object_id === selectedObjectId ? ' selected' : ''}`}
            key={object.object_id}
            onClick={() => onSelect(object.object_id === selectedObjectId ? null : object.object_id)}
          >
            <span>{object.label}</span>
            <small>{object.object_id} · {object.gaussian_count.toLocaleString()}</small>
          </button>
        ))}
        {filtered.length === 0 && <p className="empty-state">No matching objects.</p>}
      </div>
      <ObjectDetails object={selected} onDeselect={() => onSelect(null)} />
      {selected && (
        <div className="relationship-summary">
          <strong>Relationships</strong>
          <span>{relationships.length} recorded · {nearby.length} near</span>
          {nearby.length > 0 && <small>Near: {nearby.map((object) => object.label).join(', ')}</small>}
        </div>
      )}
    </aside>
  )
}
