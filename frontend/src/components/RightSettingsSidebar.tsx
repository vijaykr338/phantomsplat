import type { Anchor } from '../anchors'
import type { CameraSnapshot } from '../viewer/captureViews'

interface RightSettingsSidebarProps {
  anchors: Anchor[]
  open: boolean
  captures: CameraSnapshot[]
  captureBusy: boolean
  rotationX: number
  orientations: { label: string; value: number }[]
  onToggle: () => void
  onFlyTo: (anchor: Anchor) => void
  onLogView: () => void
  onRotationChange: (value: number) => void
  onCaptureCurrent: () => void
  onCaptureSaved: () => void
  onRestore: (snapshot: CameraSnapshot) => void
}

export function RightSettingsSidebar(props: RightSettingsSidebarProps) {
  return (
    <aside className="anchor-panel glass">
      <div className="panel-head" onClick={props.onToggle}>
        <h2>Views<span className="count">{props.anchors.length}</span></h2>
        <button type="button" className="icon-btn" aria-expanded={props.open} aria-label={props.open ? 'Collapse views panel' : 'Expand views panel'}>{props.open ? '▾' : '▸'}</button>
      </div>
      {props.open && (
        <div className="panel-body">
          <p className="section-label">Saved</p>
          {props.anchors.length > 0 ? <div className="anchor-list">{props.anchors.map((anchor) => <button type="button" className="chip" key={anchor.id} onClick={() => props.onFlyTo(anchor)}>{anchor.name}</button>)}</div> : <p className="empty">No saved views yet.</p>}
          <p className="section-label">Author</p>
          <button type="button" className="btn primary block" onClick={props.onLogView}>Log this view</button>
          <p className="hint">Copy the JSON from DevTools into <code>src/anchors.ts</code>.</p>
          <label className="field">Scene orientation
            <select value={props.rotationX} onChange={(event) => props.onRotationChange(Number(event.target.value))}>
              {props.orientations.map((orientation) => <option key={orientation.label} value={orientation.value}>{orientation.label}</option>)}
            </select>
          </label>
          <p className="section-label">Capture</p>
          <div className="capture-actions">
            <button type="button" className="btn primary block" disabled={props.captureBusy} onClick={props.onCaptureCurrent}>{props.captureBusy ? 'Capturing…' : 'Capture current'}</button>
            <button type="button" className="btn block" disabled={props.captureBusy} onClick={props.onCaptureSaved}>Capture saved views</button>
          </div>
          {props.captures.length > 0 && <div className="capture-list"><span className="hint">{props.captures.length} capture{props.captures.length === 1 ? '' : 's'} this session</span>{props.captures.map((snapshot, index) => <button type="button" className="chip" key={`${snapshot.view_id}-${index}`} onClick={() => props.onRestore(snapshot)}>Restore {snapshot.view_id}</button>)}</div>}
        </div>
      )}
    </aside>
  )
}
