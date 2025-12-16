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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GripVertical, Copy, Trash2, ChevronDown, ChevronRight, Wrench, Send, Upload, Download, Eye, Sparkles } from 'lucide-react'

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
    <Card
      ref={setNodeRef}
      style={style}
      className="bg-background border-border"
    >
      <CardHeader className="p-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            title="Drag to reorder"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <Select
            value={message.role}
            onValueChange={(value) => onUpdate(index, { ...message, role: value as 'user' | 'assistant' })}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">👤 User</SelectItem>
              <SelectItem value="assistant">🤖 Assistant</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-xs text-muted-foreground">
            {message.content.length} block{message.content.length !== 1 ? 's' : ''}
          </span>
          
          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDuplicate(index)}
            className="h-7 w-7"
            title="Duplicate message"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(index)}
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Delete message"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3 pt-3 space-y-3">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => addContentBlock('text')}
              className="text-xs h-7"
            >
              + Text
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addContentBlock('image')}
              className="text-xs h-7"
            >
              + Image
            </Button>
            {message.role === 'assistant' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    + Tool Use <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                  {selectedTools.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No tools selected. Add tools from the Tools panel.
                    </div>
                  ) : (
                    selectedTools.map((tool) => (
                      <DropdownMenuItem
                        key={tool.name}
                        onClick={() => addContentBlock('tool_use', tool)}
                        className="text-xs"
                      >
                        {tool.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {message.role === 'user' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => addContentBlock('tool_result')}
                className="text-xs h-7"
              >
                + Tool Result
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
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
      <Card className="flex-1 flex flex-col overflow-hidden bg-background">
        <CardHeader className="p-4 border-b border-border bg-background">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => addMessage('user')}
              size="sm"
            >
              + User Message
            </Button>
            <Button
              variant="outline"
              onClick={() => addMessage('assistant')}
              size="sm"
            >
              + Assistant Message
            </Button>
            
            <div className="flex-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={autoFillToolResults}
              title="Auto-fill empty tool results with sample data"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Auto-fill
            </Button>
            
            <label>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importMessages} className="hidden" />
            </label>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportMessages}
              disabled={messages.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            
            <Button
              size="sm"
              onClick={handlePreview}
              disabled={messages.length === 0}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
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
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="w-80 flex flex-col gap-4">
        <Card className="bg-background">
          <Collapsible open={showToolsPanel} onOpenChange={setShowToolsPanel}>
            <CollapsibleTrigger asChild>
              <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Tools ({selectedTools.length})
                  </span>
                  {showToolsPanel ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-0 border-t border-border">
                <ScrollArea className="h-60">
                  <div className="divide-y divide-border">
                    {TEST_TOOLS.map(tool => (
                      <label
                        key={tool.name}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTools.some(t => t.name === tool.name)}
                          onCheckedChange={() => toggleTool(tool)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono truncate">{tool.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{tool.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 bg-background">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">🧪 API Testing</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3 flex-1 flex flex-col min-h-0">
            <div>
              <Label className="text-xs">Base URL</Label>
              <Input
                value={apiSettings.baseUrl}
                onChange={(e) => setApiSettings({ ...apiSettings, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="h-8 text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                value={apiSettings.apiKey}
                onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="h-8 text-sm"
              />
            </div>
            
            <div>
              <Label className="text-xs">Model</Label>
              <Input
                value={apiSettings.model}
                onChange={(e) => setApiSettings({ ...apiSettings, model: e.target.value })}
                placeholder="gpt-4"
                className="h-8 text-sm"
              />
            </div>
            
            <Button
              onClick={testAPI}
              disabled={isTestingAPI || messages.length === 0}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isTestingAPI ? 'Testing...' : 'Send to API'}
            </Button>
            
            {apiResponse && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Response</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyApiResponse}
                      className="h-6 text-xs px-2"
                    >
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsResponseExpanded(true)}
                      className="h-6 text-xs px-2"
                    >
                      Expand
                    </Button>
                  </div>
                </div>
                <pre className="bg-background border border-border rounded p-2 text-xs text-foreground/80 overflow-auto flex-1 max-h-32">
                  {apiResponse}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isResponseExpanded} onOpenChange={setIsResponseExpanded}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center justify-between">
              <span>API Response</span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyApiResponse}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <pre className="p-4 text-sm font-mono">
              {apiResponse}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
