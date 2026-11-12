import { useState } from 'react'

export function ControlsGuide() {
  const [open, setOpen] = useState(true)
  return (
    <aside className="controls-guide glass">
      {open && (
        <div className="keys">
          <span>Drag: look</span>
          <span><kbd>WASD</kbd> move</span>
          <span><kbd>Q</kbd>/<kbd>E</kbd> down/up</span>
          <span>Scroll: fwd/back</span>
          <span><kbd>Shift</kbd> fast</span>
        </div>
      )}
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Hide controls' : 'Show controls'}
      >
        {open ? '×' : '?'}
      </button>
    </aside>
  )
}
