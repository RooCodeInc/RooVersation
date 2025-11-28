import { useState } from 'react'
import MessageBlock from './MessageBlock'

interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
  summary?: string[]
}

interface Message {
  role: 'user' | 'assistant'
  content: ContentBlock[]
  ts: number
}

interface ConversationViewProps {
  messages: Message[]
  taskId: string
  onClose: () => void
}

export default function ConversationView({ messages, taskId, onClose }: ConversationViewProps) {
  const [expandAll, setExpandAll] = useState(true)

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="font-semibold text-slate-200">Conversation</h2>
          <div className="text-xs text-slate-400 font-mono">{taskId}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-blue-900/30 border border-blue-800'
                : 'bg-slate-700/50 border border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-600">
              <span className={`font-semibold text-sm ${
                message.role === 'user' ? 'text-blue-300' : 'text-slate-300'
              }`}>
                {message.role === 'user' ? '👤 User' : '🤖 Assistant'}
              </span>
              <span className="text-xs text-slate-400">
                {formatTime(message.ts)}
              </span>
            </div>
            
            <div className="space-y-3">
              {message.content.map((block, blockIndex) => (
                <MessageBlock
                  key={blockIndex}
                  block={block}
                  expanded={expandAll}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
