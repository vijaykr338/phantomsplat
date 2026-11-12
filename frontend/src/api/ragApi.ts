export interface QueryResult {
  object_id: string
  label: string
  distance: number | null
  room_id: string | null
}

export interface QueryResponse {
  status: 'success' | 'not_found' | 'ambiguous' | 'invalid'
  answer: string
  results: QueryResult[]
  actions: { type: 'highlight' | 'fly_to'; object_id: string }[]
  clarification: {
    question: string
    options: { object_id: string; label?: string }[]
  } | null
  evidence: Record<string, unknown>
}

export async function querySpatialApi(
  question: string,
  context: { selected_object_id?: string | null } = {},
): Promise<QueryResponse> {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  })
  if (!response.ok) {
    throw new Error(`Spatial query failed (HTTP ${response.status}).`)
  }
  return response.json() as Promise<QueryResponse>
}
