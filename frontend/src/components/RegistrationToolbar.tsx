import { useState } from 'react'
import type { SpatialObject } from '../spatial/objectTypes'

interface RegistrationToolbarProps {
  objects: SpatialObject[]
  selectedObjectId: string | null
  onBeginPlacement: (label: string) => void
  onFocus: (object: SpatialObject) => void
  onExport: () => void
}

export function RegistrationToolbar({
  objects,
  selectedObjectId,
  onBeginPlacement,
  onFocus,
  onExport,
}: RegistrationToolbarProps) {
  const [label, setLabel] = useState('')

  return (
    <section className="registration-toolbar glass" aria-label="Register an object">
      <div>
        <p className="section-label">Register objects</p>
        <strong>{objects.length}/3 anchors saved</strong>
      </div>
      <form
        className="registration-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!label.trim()) return
          onBeginPlacement(label)
          setLabel('')
        }}
      >
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. sofa"
          aria-label="New object label"
        />
        <button type="submit" className="btn primary">Place</button>
      </form>
      <button type="button" className="btn" onClick={onExport}>Export JSON</button>
      {objects.length > 0 && (
        <div className="registered-object-list">
          {objects.map((object) => (
            <button
              type="button"
              className={`registered-object${object.object_id === selectedObjectId ? ' selected' : ''}`}
              key={object.object_id}
              onClick={() => onFocus(object)}
            >
              <span className="registered-dot" />
              {object.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
