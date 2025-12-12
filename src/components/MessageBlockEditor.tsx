import { useState, useRef } from 'react'
import type { ContentBlock, TestTool } from '../types'
import { generateId } from '../types'
import { generateSampleToolInput } from '../testTools'

interface MessageBlockEditorProps {
  block: ContentBlock
  onUpdate: (block: ContentBlock) => void
  onDelete: () => void
  selectedTools: TestTool[]
}

export default function MessageBlockEditor({ block, onUpdate, onDelete, selectedTools }: MessageBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const typeColors: Record<string, string> = {
    text: 'bg-green-900/50 border-green-700',
    reasoning: 'bg-purple-900/50 border-purple-700',
    tool_use: 'bg-yellow-900/50 border-yellow-700',
    tool_result: 'bg-blue-900/50 border-blue-700',
    image: 'bg-pink-900/50 border-pink-700',
  }

  const bgColor = typeColors[block.type] || 'bg-slate-700 border-slate-600'

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      onUpdate({
        ...block,
        source: {
          type: 'base64',
          media_type: file.type,
          data: base64
        }
      })
    }
    reader.readAsDataURL(file)
  }

  const renderEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            value={block.text || ''}
            onChange={(e) => onUpdate({ ...block, text: e.target.value })}
            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-slate-200 min-h-[80px] resize-y"
            placeholder="Enter text content..."
          />
        )

      case 'reasoning':
        return (
          <div className="space-y-2">
            <textarea
              value={block.text || ''}
              onChange={(e) => onUpdate({ ...block, text: e.target.value })}
              className="w-full bg-purple-900/30 border border-purple-700 rounded p-2 text-sm text-purple-200 min-h-[80px] resize-y"
              placeholder="Enter reasoning content..."
            />
            <div>
              <label className="block text-xs text-purple-300 mb-1">Summary (one per line)</label>
              <textarea
                value={(block.summary || []).join('\n')}
                onChange={(e) => onUpdate({ ...block, summary: e.target.value.split('\n').filter(Boolean) })}
                className="w-full bg-purple-900/30 border border-purple-700 rounded p-2 text-sm text-purple-200 min-h-[60px] resize-y"
                placeholder="Summary points..."
              />
            </div>
          </div>
        )

      case 'tool_use':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-yellow-300 mb-1">Tool Name</label>
                <select
                  value={block.name || ''}
                  onChange={(e) => {
                    const tool = selectedTools.find(t => t.name === e.target.value)
                    onUpdate({
                      ...block,
                      name: e.target.value,
                      input: tool ? generateSampleToolInput(tool) : {}
                    })
                  }}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                >
                  <option value="">Select a tool...</option>
                  {selectedTools.map(tool => (
                    <option key={tool.name} value={tool.name}>{tool.name}</option>
                  ))}
                  {block.name && !selectedTools.find(t => t.name === block.name) && (
                    <option value={block.name}>{block.name} (custom)</option>
                  )}
                </select>
              </div>
              <div className="w-48">
                <label className="block text-xs text-yellow-300 mb-1">ID</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={block.id || ''}
                    onChange={(e) => onUpdate({ ...block, id: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-400 font-mono"
                    placeholder="toolu_..."
                  />
                  <button
                    onClick={() => onUpdate({ ...block, id: generateId() })}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                    title="Generate new ID"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-yellow-300 mb-1">Input (JSON)</label>
              <textarea
                value={JSON.stringify(block.input || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    onUpdate({ ...block, input: parsed })
                  } catch {
                    // Keep the text but don't update if invalid JSON
                  }
                }}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-slate-200 font-mono min-h-[100px] resize-y"
                placeholder="{}"
              />
            </div>
          </div>
        )

      case 'tool_result':
        return (
          <div className="space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-blue-300 mb-1">Tool Use ID (reference)</label>
                <input
                  type="text"
                  value={block.tool_use_id || ''}
                  onChange={(e) => onUpdate({ ...block, tool_use_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 font-mono"
                  placeholder="toolu_..."
                />
              </div>
              <label className="flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={block.is_error || false}
                  onChange={(e) => onUpdate({ ...block, is_error: e.target.checked })}
                  className="rounded border-slate-500"
                />
                <span className="text-xs text-red-300">Error</span>
              </label>
            </div>
            <div>
              <label className="block text-xs text-blue-300 mb-1">Content</label>
              <textarea
                value={block.content || ''}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                className={`w-full border rounded p-2 text-sm min-h-[80px] resize-y ${
                  block.is_error
                    ? 'bg-red-900/30 border-red-700 text-red-200'
                    : 'bg-slate-900 border-slate-600 text-slate-200'
                }`}
                placeholder="Tool result content..."
              />
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
              >
                Upload Image
              </button>
              <span className="text-xs text-slate-400">
                {block.source?.media_type || 'No image selected'}
              </span>
            </div>
            
            {block.source?.data && (
              <div className="space-y-2">
                <img
                  src={`data:${block.source.media_type};base64,${block.source.data}`}
                  alt="Preview"
                  className="max-w-full max-h-48 rounded border border-slate-600"
                />
                <div className="text-xs text-slate-400">
                  Base64 data: {block.source.data.length} characters
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs text-pink-300 mb-1">Or paste Base64 data directly</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={block.source?.media_type || ''}
                  onChange={(e) => onUpdate({
                    ...block,
                    source: { ...block.source, type: 'base64', media_type: e.target.value }
                  })}
                  className="w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                  placeholder="image/png"
                />
                <input
                  type="text"
                  value={block.source?.data || ''}
                  onChange={(e) => onUpdate({
                    ...block,
                    source: { ...block.source, type: 'base64', data: e.target.value }
                  })}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  placeholder="Base64 encoded image data..."
                />
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Raw JSON</label>
            <textarea
              value={JSON.stringify(block, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onUpdate(parsed)
                } catch {
                  // Keep the text but don't update if invalid JSON
                }
              }}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-slate-200 font-mono min-h-[100px] resize-y"
            />
          </div>
        )
    }
  }

  return (
    <div className={`border rounded p-3 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          block.type === 'text' ? 'bg-green-800 text-green-200' :
          block.type === 'reasoning' ? 'bg-purple-800 text-purple-200' :
          block.type === 'tool_use' ? 'bg-yellow-800 text-yellow-200' :
          block.type === 'tool_result' ? 'bg-blue-800 text-blue-200' :
          block.type === 'image' ? 'bg-pink-800 text-pink-200' :
          'bg-slate-700 text-slate-200'
        }`}>
          {block.type}
        </span>
        
        <select
          value={block.type}
          onChange={(e) => {
            const newType = e.target.value
            const newBlock: ContentBlock = { type: newType }
            
            if (newType === 'text') {
              newBlock.text = ''
            } else if (newType === 'tool_use') {
              newBlock.id = block.id || generateId()
              newBlock.name = ''
              newBlock.input = {}
            } else if (newType === 'tool_result') {
              newBlock.tool_use_id = ''
              newBlock.content = ''
              newBlock.is_error = false
            } else if (newType === 'reasoning') {
              newBlock.text = ''
              newBlock.summary = []
            } else if (newType === 'image') {
              newBlock.source = {
                type: 'base64',
                media_type: 'image/png',
                data: ''
              }
            }
            
            onUpdate(newBlock)
          }}
          className="bg-slate-800 text-xs text-slate-300 rounded px-1 py-0.5 border border-slate-600"
        >
          <option value="text">text</option>
          <option value="tool_use">tool_use</option>
          <option value="tool_result">tool_result</option>
          <option value="reasoning">reasoning</option>
          <option value="image">image</option>
        </select>
        
        <div className="flex-1" />
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-slate-600/50 rounded text-slate-400 text-xs"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-900/50 rounded text-red-400"
          title="Delete block"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {isExpanded && renderEditor()}
    </div>
  )
}
