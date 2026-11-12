import { useState, type FormEvent } from 'react'
import { querySpatialApi, type QueryResponse } from '../api/ragApi'

interface ChatPanelProps {
  selectedObjectId: string | null
  onResults: (response: QueryResponse) => void
}

export function ChatPanel({ selectedObjectId, onResults }: ChatPanelProps) {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!question.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await querySpatialApi(question, { selected_object_id: selectedObjectId })
      setResponse(next)
      onResults(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to query the spatial engine.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="chat-panel glass">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Spatial RAG</p>
          <h2>Ask the scene</h2>
        </div>
        <span className="viewer-badge">Deterministic</span>
      </div>
      <form className="chat-form" onSubmit={submit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Find the three chairs closest to the table"
          aria-label="Ask the scene"
          rows={2}
        />
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Querying…' : 'Ask'}
        </button>
      </form>
      {error && <p className="chat-error" role="alert">{error}</p>}
      {response && (
        <div className="chat-response">
          <p>{response.answer}</p>
          {response.status === 'ambiguous' && response.clarification && (
            <div className="chat-clarification">
              <span>{response.clarification.question}</span>
              {response.clarification.options.map((option) => (
                <button
                  type="button"
                  className="chip"
                  key={option.object_id}
                  onClick={() => setQuestion(`${question} (${option.object_id})`)}
                >
                  {option.label ?? 'object'} #{option.object_id}
                </button>
              ))}
            </div>
          )}
          {response.results.length > 0 && (
            <div className="chat-results">
              {response.results.slice(0, 8).map((item) => (
                <span key={item.object_id}>
                  {item.label} #{item.object_id}
                  {item.distance === null ? '' : ` · ${item.distance.toFixed(2)} m`}
                </span>
              ))}
              {response.results.length > 8 && <small>+{response.results.length - 8} more highlighted</small>}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
