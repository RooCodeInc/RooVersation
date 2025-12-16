import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Message, ContentBlock, APISettings as APISettingsType, TestTool } from '../types'
import { generateId } from '../types'
import { TEST_TOOLS, generateSampleToolInput, generateSampleToolResult } from '../testTools'
import MessageBlockEditor from './MessageBlockEditor'

interface DraggableMessageProps {
  message: Message & { _id: string }
  index: number
  onUpdate: (index: number, message: Message) => void
  onDelete: (index: number) => void
  onDuplicate: (index: number) => void
  selectedTools: TestTool[]
}

function DraggableMessage({ message, index, onUpdate, onDelete, onDuplicate, selectedTools }: DraggableMessageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [isExpanded, setIsExpanded] = useState(true)

  const addContentBlock = (type: string, tool?: TestTool) => {
    const newBlock: ContentBlock = { type }
    
    if (type === 'text') {
      newBlock.text = ''
    } else if (type === 'tool_use' && tool) {
      newBlock.id = generateId()
      newBlock.name = tool.name
      newBlock.input = generateSampleToolInput(tool)
    } else if (type === 'tool_result') {
      newBlock.tool_use_id = ''
      newBlock.content = ''
      newBlock.is_error = false
    } else if (type === 'image') {
      newBlock.source = {
        type: 'base64',
        media_type: 'image/png',
        data: ''
      }
    }
    
    onUpdate(index, {
      ...message,
      content: [...message.content, newBlock]
    })
  }

  const updateContentBlock = (blockIndex: number, block: ContentBlock) => {
    const newContent = [...message.content]
    newContent[blockIndex] = block
    onUpdate(index, { ...message, content: newContent })
  }

  const deleteContentBlock = (blockIndex: number) => {
    const newContent = message.content.filter((_, i) => i !== blockIndex)
    onUpdate(index, { ...message, content: newContent })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border ${
        message.role === 'user'
          ? 'bg-blue-900/30 border-blue-800'
          : 'bg-slate-700/50 border-slate-600'
      }`}
    >
      <div className="p-3 border-b border-slate-600 flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-600 rounded"
          title="Drag to reorder"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>
        
        <select
          value={message.role}
          onChange={(e) => onUpdate(index, { ...message, role: e.target.value as 'user' | 'assistant' })}
          className="bg-slate-700 text-sm text-slate-200 rounded px-2 py-1 border border-slate-600"
        >
          <option value="user">👤 User</option>
          <option value="assistant">🤖 Assistant</option>
        </select>
        
        <span className="text-xs text-slate-400">
          {message.content.length} block{message.content.length !== 1 ? 's' : ''}
        </span>
        
        <div className="flex-1" />
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-slate-600 rounded text-slate-400"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        
        <button
          onClick={() => onDuplicate(index)}
          className="p-1 hover:bg-slate-600 rounded text-slate-400"
          title="Duplicate message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
          </svg>
        </button>
        
        <button
          onClick={() => onDelete(index)}
          className="p-1 hover:bg-red-900/50 rounded text-red-400"
          title="Delete message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-3 space-y-3">
          {message.content.map((block, blockIndex) => (
            <MessageBlockEditor
              key={blockIndex}
              block={block}
              onUpdate={(updated) => updateContentBlock(blockIndex, updated)}
              onDelete={() => deleteContentBlock(blockIndex)}
              selectedTools={selectedTools}
            />
          ))}
          
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => addContentBlock('text')}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600"
            >
              + Text
            </button>
            <button
              onClick={() => addContentBlock('image')}
              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600"
            >
              + Image
            </button>
            {message.role === 'assistant' && (
              <div className="relative group">
                <button
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600"
                >
                  + Tool Use ▼
                </button>
                <div className="absolute left-0 top-full pt-1 hidden group-hover:block">
                  <div className="bg-slate-800 border border-slate-600 rounded shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
                    {selectedTools.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">
                        No tools selected. Add tools from the Tools panel.
                      </div>
                    ) : (
                      selectedTools.map((tool) => (
                        <button
                          key={tool.name}
                          onClick={() => addContentBlock('tool_use', tool)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          {tool.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            {message.role === 'user' && (
              <button
                onClick={() => addContentBlock('tool_result')}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-600"
              >
                + Tool Result
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ConversationBuilderProps {
  onPreview: (messages: Message[]) => void
  messages: (Message & { _id: string })[]
  onMessagesChange: (messages: (Message & { _id: string })[]) => void
}

interface APILogEntry {
  id: string
  timestamp: Date
  request: {
    model: string
    messages: unknown[]
    tools?: unknown[]
  }
  response: unknown
  error?: string
}

export default function ConversationBuilder({ onPreview, messages, onMessagesChange }: ConversationBuilderProps) {
  const [selectedTools, setSelectedTools] = useState<TestTool[]>([])
  const [apiSettings, setApiSettings] = useState<APISettingsType>(() => {
    const saved = localStorage.getItem('convo-builder-api-settings')
    return saved ? JSON.parse(saved) : {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4'
    }
  })
  const [isTestingAPI, setIsTestingAPI] = useState(false)
  const [apiResponse, setApiResponse] = useState<string | null>(null)
  const [showToolsPanel, setShowToolsPanel] = useState(false)
  const [isResponseExpanded, setIsResponseExpanded] = useState(false)
  const [apiLogs, setApiLogs] = useState<APILogEntry[]>([])
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())
  const [showLogsPanel, setShowLogsPanel] = useState(true)

  useEffect(() => {
    localStorage.setItem('convo-builder-api-settings', JSON.stringify(apiSettings))
  }, [apiSettings])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = messages.findIndex((item) => item._id === active.id)
      const newIndex = messages.findIndex((item) => item._id === over.id)
      onMessagesChange(arrayMove(messages, oldIndex, newIndex))
    }
  }

  const addMessage = (role: 'user' | 'assistant') => {
    const newMessage: Message & { _id: string } = {
      _id: crypto.randomUUID(),
      role,
      content: [{ type: 'text', text: '' }],
      ts: Date.now()
    }
    onMessagesChange([...messages, newMessage])
  }

  const updateMessage = (index: number, message: Message) => {
    const newMessages = [...messages]
    newMessages[index] = { ...message, _id: messages[index]._id }
    onMessagesChange(newMessages)
  }

  const deleteMessage = (index: number) => {
    onMessagesChange(messages.filter((_, i) => i !== index))
  }

  const duplicateMessage = (index: number) => {
    const message = messages[index]
    const duplicate: Message & { _id: string } = {
      ...JSON.parse(JSON.stringify(message)),
      _id: crypto.randomUUID(),
      ts: Date.now()
    }
    const newMessages = [...messages]
    newMessages.splice(index + 1, 0, duplicate)
    onMessagesChange(newMessages)
  }

  const exportMessages = useCallback(() => {
    const cleanMessages = messages.map(({ _id, ...rest }) => rest)
    const blob = new Blob([JSON.stringify(cleanMessages, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  const importMessages = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        if (Array.isArray(data)) {
          const withIds = data.map((msg: Message) => ({
            ...msg,
            _id: crypto.randomUUID(),
            content: Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }]
          }))
          onMessagesChange(withIds)
        }
      } catch (err) {
        console.error('Failed to import conversation:', err)
        alert('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }, [onMessagesChange])

  const testAPI = async () => {
    if (!apiSettings.apiKey) {
      alert('Please enter an API key')
      return
    }

    setIsTestingAPI(true)
    setApiResponse(null)

    try {
      interface OpenAIMessage {
        role: string
        content?: Array<{ type: string; text?: string; image_url?: { url: string } }> | string | null
        tool_call_id?: string
        tool_calls?: Array<{
          id: string
          type: 'function'
          function: {
            name: string
            arguments: string
          }
        }>
      }
      
      const cleanMessages: OpenAIMessage[] = []

      for (const msg of messages) {
        if (msg.role === 'user') {
          // Handle user messages - separate tool results from other content
          const toolResultBlocks = msg.content.filter(b => b.type === 'tool_result')
          const otherBlocks = msg.content.filter(b => b.type !== 'tool_result')

          // Add tool results as separate "tool" role messages (OpenAI format)
          for (const toolResult of toolResultBlocks) {
            cleanMessages.push({
              role: 'tool',
              tool_call_id: toolResult.tool_use_id || '',
              content: toolResult.content || ''
            })
          }

          // Add remaining content as regular user message
          if (otherBlocks.length > 0) {
            cleanMessages.push({
              role: 'user',
              content: otherBlocks.map(block => {
                if (block.type === 'text') {
                  return { type: 'text', text: block.text || '' }
                }
                if (block.type === 'image' && block.source) {
                  return {
                    type: 'image_url',
                    image_url: {
                      url: `data:${block.source.media_type || 'image/png'};base64,${block.source.data || ''}`
                    }
                  }
                }
                return block as { type: string; text?: string; image_url?: { url: string } }
              })
            })
          }
        } else {
          // Handle assistant messages - convert tool_use to tool_calls format
          const toolUseBlocks = msg.content.filter(b => b.type === 'tool_use')
          const textBlocks = msg.content.filter(b => b.type === 'text')
          
          const assistantMsg: OpenAIMessage = {
            role: 'assistant',
            content: textBlocks.length > 0
              ? textBlocks.map(b => b.text || '').join('\n')
              : null
          }

          // Convert tool_use blocks to OpenAI tool_calls format
          if (toolUseBlocks.length > 0) {
            assistantMsg.tool_calls = toolUseBlocks.map(block => ({
              id: block.id || '',
              type: 'function' as const,
              function: {
                name: block.name || '',
                arguments: JSON.stringify(block.input || {})
              }
            }))
          }

          cleanMessages.push(assistantMsg)
        }
      }

      const body: Record<string, unknown> = {
        model: apiSettings.model,
        messages: cleanMessages,
        max_tokens: 1024
      }

      if (selectedTools.length > 0) {
        body.tools = selectedTools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema
          }
        }))
      }

      const logId = crypto.randomUUID()
      const logEntry: APILogEntry = {
        id: logId,
        timestamp: new Date(),
        request: {
          model: apiSettings.model,
          messages: cleanMessages,
          tools: body.tools as unknown[] | undefined
        },
        response: null
      }

      const response = await fetch(`${apiSettings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      logEntry.response = data
      setApiLogs(prev => [logEntry, ...prev])
      setExpandedLogIds(prev => new Set([...prev, logId]))
      setApiResponse(JSON.stringify(data, null, 2))

      if (data.choices?.[0]?.message) {
        const assistantMessage = data.choices[0].message
        const newContent: ContentBlock[] = []
        
        if (assistantMessage.content) {
          newContent.push({ type: 'text', text: assistantMessage.content })
        }
        
        if (assistantMessage.tool_calls) {
          for (const toolCall of assistantMessage.tool_calls) {
            newContent.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments || '{}')
            })
          }
        }

        if (newContent.length > 0) {
          const newMessage: Message & { _id: string } = {
            _id: crypto.randomUUID(),
            role: 'assistant',
            content: newContent,
            ts: Date.now()
          }
          onMessagesChange([...messages, newMessage])
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      const logEntry: APILogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        request: {
          model: apiSettings.model,
          messages: [],
          tools: undefined
        },
        response: null,
        error: errorMsg
      }
      setApiLogs(prev => [logEntry, ...prev])
      setApiResponse(`Error: ${errorMsg}`)
    } finally {
      setIsTestingAPI(false)
    }
  }

  const toggleTool = (tool: TestTool) => {
    setSelectedTools(prev => {
      const exists = prev.find(t => t.name === tool.name)
      if (exists) {
        return prev.filter(t => t.name !== tool.name)
      }
      return [...prev, tool]
    })
  }

  const handlePreview = () => {
    const cleanMessages = messages.map(({ _id, ...rest }) => rest)
    onPreview(cleanMessages)
  }

  const copyApiResponse = async () => {
    if (apiResponse) {
      try {
        await navigator.clipboard.writeText(apiResponse)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const autoFillToolResults = () => {
    const toolUseMap = new Map<string, string>()
    
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        for (const block of msg.content) {
          if (block.type === 'tool_use' && block.id && block.name) {
            toolUseMap.set(block.id, block.name)
          }
        }
      }
    }
    
    let hasChanges = false
    const newMessages = messages.map(msg => {
      if (msg.role === 'user') {
        const newContent = msg.content.map(block => {
          if (block.type === 'tool_result' && block.tool_use_id) {
            const isEmpty = !block.content || block.content.trim() === ''
            if (isEmpty) {
              const toolName = toolUseMap.get(block.tool_use_id) || 'unknown'
              hasChanges = true
              return {
                ...block,
                content: generateSampleToolResult(toolName, block.is_error)
              }
            }
          }
          return block
        })
        return { ...msg, content: newContent }
      }
      return msg
    })
    
    if (hasChanges) {
      onMessagesChange(newMessages)
    } else {
      alert('No empty tool results to fill. Make sure tool results have a valid tool_use_id reference.')
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Main Builder Area */}
      <div className="flex-1 flex flex-col bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => addMessage('user')}
            className="px-3 py-1.5 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded"
          >
            + User Message
          </button>
          <button
            onClick={() => addMessage('assistant')}
            className="px-3 py-1.5 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded"
          >
            + Assistant Message
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={autoFillToolResults}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
            title="Auto-fill empty tool results with sample data"
          >
            Auto-fill Results
          </button>
          
          <label className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded cursor-pointer">
            Import
            <input type="file" accept=".json" onChange={importMessages} className="hidden" />
          </label>
          
          <button
            onClick={exportMessages}
            className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
            disabled={messages.length === 0}
          >
            Export
          </button>
          
          <button
            onClick={handlePreview}
            className="px-3 py-1.5 text-sm bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded"
            disabled={messages.length === 0}
          >
            Preview
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Click "User Message" or "Assistant Message" to start building a conversation</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={messages.map(m => m._id)}
                strategy={verticalListSortingStrategy}
              >
                {messages.map((message, index) => (
                  <DraggableMessage
                    key={message._id}
                    message={message}
                    index={index}
                    onUpdate={updateMessage}
                    onDelete={deleteMessage}
                    onDuplicate={duplicateMessage}
                    selectedTools={selectedTools}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Right Panel - Tools & API */}
      <div className="w-96 flex flex-col gap-4 overflow-hidden">
        {/* Tools Panel */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
          <button
            onClick={() => setShowToolsPanel(!showToolsPanel)}
            className="w-full p-3 flex items-center justify-between text-slate-200 hover:bg-slate-700"
          >
            <span className="font-medium">🔧 Tools ({selectedTools.length})</span>
            <span>{showToolsPanel ? '▼' : '▶'}</span>
          </button>
          
          {showToolsPanel && (
            <div className="border-t border-slate-700 max-h-60 overflow-y-auto">
              {TEST_TOOLS.map(tool => (
                <label
                  key={tool.name}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTools.some(t => t.name === tool.name)}
                    onChange={() => toggleTool(tool)}
                    className="rounded border-slate-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-mono truncate">{tool.name}</div>
                    <div className="text-xs text-slate-400 truncate">{tool.description}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* API Settings */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3 flex-shrink-0">
          <h3 className="font-medium text-slate-200">🧪 API Testing</h3>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Base URL</label>
            <input
              type="text"
              value={apiSettings.baseUrl}
              onChange={(e) => setApiSettings({ ...apiSettings, baseUrl: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
              placeholder="https://api.openai.com/v1"
            />
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Key</label>
            <input
              type="password"
              value={apiSettings.apiKey}
              onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
              placeholder="sk-..."
            />
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model</label>
            <input
              type="text"
              value={apiSettings.model}
              onChange={(e) => setApiSettings({ ...apiSettings, model: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
              placeholder="gpt-4"
            />
          </div>
          
          <button
            onClick={testAPI}
            disabled={isTestingAPI || messages.length === 0}
            className="w-full px-3 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium"
          >
            {isTestingAPI ? 'Testing...' : 'Send to API'}
          </button>
        </div>

        {/* API Logs Panel */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex-1 flex flex-col min-h-0">
          <button
            onClick={() => setShowLogsPanel(!showLogsPanel)}
            className="w-full p-3 flex items-center justify-between text-slate-200 hover:bg-slate-700 flex-shrink-0"
          >
            <span className="font-medium">📋 API Logs ({apiLogs.length})</span>
            <div className="flex items-center gap-2">
              {apiLogs.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setApiLogs([])
                    setExpandedLogIds(new Set())
                  }}
                  className="px-2 py-0.5 text-xs bg-red-900/50 hover:bg-red-900 text-red-300 rounded"
                >
                  Clear
                </button>
              )}
              <span>{showLogsPanel ? '▼' : '▶'}</span>
            </div>
          </button>
          
          {showLogsPanel && (
            <div className="border-t border-slate-700 overflow-y-auto flex-1">
              {apiLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No API calls yet. Send a request to see logs here.
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="text-xs">
                      <button
                        onClick={() => {
                          setExpandedLogIds(prev => {
                            const next = new Set(prev)
                            if (next.has(log.id)) {
                              next.delete(log.id)
                            } else {
                              next.add(log.id)
                            }
                            return next
                          })
                        }}
                        className={`w-full p-2 text-left hover:bg-slate-700 flex items-center gap-2 ${
                          log.error ? 'bg-red-900/20' : ''
                        }`}
                      >
                        <span>{expandedLogIds.has(log.id) ? '▼' : '▶'}</span>
                        <span className="text-slate-400">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-slate-200 truncate flex-1">
                          {log.request.model}
                        </span>
                        {log.error ? (
                          <span className="text-red-400">Error</span>
                        ) : (
                          <span className="text-green-400">OK</span>
                        )}
                      </button>
                      
                      {expandedLogIds.has(log.id) && (
                        <div className="p-2 bg-slate-900 space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-400 font-medium">Request Messages:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(log.request.messages, null, 2))}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                              >
                                Copy
                              </button>
                            </div>
                            <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-[10px] text-slate-300 max-h-48">
                              {JSON.stringify(log.request.messages, null, 2)}
                            </pre>
                          </div>
                          
                          {log.request.tools && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-slate-400 font-medium">Tools:</span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(JSON.stringify(log.request.tools, null, 2))}
                                  className="px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="bg-slate-950 p-2 rounded overflow-x-auto text-[10px] text-slate-300 max-h-32">
                                {JSON.stringify(log.request.tools, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-400 font-medium">Response:</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(log.response, null, 2))}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                              >
                                Copy
                              </button>
                            </div>
                            <pre className={`bg-slate-950 p-2 rounded overflow-x-auto text-[10px] max-h-48 ${
                              log.error ? 'text-red-300' : 'text-slate-300'
                            }`}>
                              {log.error || JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Response Modal */}
      {isResponseExpanded && apiResponse && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8"
          onClick={() => setIsResponseExpanded(false)}
        >
          <div 
            className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-4xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-600 flex items-center justify-between">
              <h3 className="font-medium text-slate-200">API Response</h3>
              <div className="flex gap-2">
                <button
                  onClick={copyApiResponse}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
                >
                  Copy
                </button>
                <button
                  onClick={() => setIsResponseExpanded(false)}
                  className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-sm text-slate-300 font-mono">
              {apiResponse}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
