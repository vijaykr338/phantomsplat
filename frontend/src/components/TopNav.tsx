interface TopNavProps {
  status: string
  ready: boolean
  onReset: () => void
}

export function TopNav({ status, ready, onReset }: TopNavProps) {
  return (
    <header className="hud-top">
      <div className="title-card glass">
        <div className="title-row">
          <h1>Milano Living</h1>
          <span className="badge">PLY · dev</span>
        </div>
        <p className="scene-status" title={status}>
          <span className={`status-dot${ready ? ' ready' : ''}`} />
          <span>{status}</span>
        </p>
      </div>
      <button type="button" className="btn" onClick={onReset}>
        ⟲ Reset view
      </button>
    </header>
  )
}
