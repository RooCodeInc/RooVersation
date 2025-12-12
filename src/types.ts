export interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
  summary?: string[]
  source?: {
    type: string
    media_type?: string
    data?: string
  }
}

export interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
  ts: number
  isSummary?: boolean
  condenseId?: string
  condenseParent?: string
  isTruncationMarker?: boolean
  truncationId?: string
  truncationParent?: string
}

export interface Task {
  id: string
  timestamp: number
  firstMessage: string
}

export interface TestTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
}

export interface APISettings {
  baseUrl: string
  apiKey: string
  model: string
}

export function normalizeContent(content: ContentBlock[] | string): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: String(content) }]
  }
  return content
}

export function generateId(): string {
  return `toolu_${Math.random().toString(36).substring(2, 15)}`
}
