import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, Copy, ChevronDown, ChevronRight, ArrowDown, ClipboardList, Scissors, User, Bot } from 'lucide-react'
import MessageBlock from './MessageBlock'
import type { UIMessage } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  content: ContentBlock[] | string
  ts: number
  isSummary?: boolean
  condenseId?: string
  condenseParent?: string
  isTruncationMarker?: boolean
  truncationId?: string
  truncationParent?: string
}

function normalizeContent(content: ContentBlock[] | string): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: String(content) }]
  }
  return content
}

interface ConversationViewProps {
  messages: Message[]
  uiMessages?: UIMessage[] | null
  taskId: string
  onClose: () => void
}

interface UIMessageContentBlockProps {
  text: string
  expanded: boolean
  badgeClass: string
}

function UIMessageContentBlock({ text, expanded: initialExpanded, badgeClass }: UIMessageContentBlockProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  
  useEffect(() => {
    setIsExpanded(initialExpanded)
  }, [initialExpanded])
  
  const getPreviewText = () => {
    const maxLength = 100
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.slice(0, maxLength) + '…'
  }
  
  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="border border-border rounded p-3 bg-muted"
    >
      <CollapsibleTrigger className="w-full text-left hover:bg-muted/80 -m-3 p-3 rounded transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-xs shrink-0 ${badgeClass}`}>
            text
          </Badge>
          {!isExpanded && (
            <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
              {getPreviewText()}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0 ml-auto flex items-center gap-1">
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" />
                Expand
              </>
            )}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="message-content mt-2 overflow-hidden">
          <pre className="text-sm text-foreground/90 whitespace-pre-wrap break-all bg-background p-3 rounded border border-border" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {text}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function ConversationView({ messages, uiMessages, taskId, onClose }: ConversationViewProps) {
  const [expandAll, setExpandAll] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [filterCondensed, setFilterCondensed] = useState(true)
  const [showUiMessages, setShowUiMessages] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const toolUsesMissingResults = useMemo(() => {
    const toolResultIds = new Set<string>()
    const toolUsePositions = new Map<string, { messageIndex: number; blockIndex: number }>()
    
    messages.forEach((message, messageIndex) => {
      normalizeContent(message.content).forEach((block, blockIndex) => {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResultIds.add(block.tool_use_id)
        }
        if (block.type === 'tool_use' && block.id) {
          toolUsePositions.set(block.id, { messageIndex, blockIndex })
        }
      })
    })
    
    const missingResults = new Set<string>()
    const lastMessageIndex = messages.length - 1
    
    toolUsePositions.forEach((position, toolUseId) => {
      if (!toolResultIds.has(toolUseId)) {
        const hasMessageAfter = position.messageIndex < lastMessageIndex
        if (hasMessageAfter) {
          missingResults.add(toolUseId)
        }
      }
    })
    
    return missingResults
  }, [messages])

  const existingSummaryIds = useMemo(() => new Set(
    messages
      .filter((m) => m.isSummary && m.condenseId)
      .map((m) => m.condenseId!)
  ), [messages])

  const existingTruncationIds = useMemo(() => new Set(
    messages
      .filter((m) => m.isTruncationMarker && m.truncationId)
      .map((m) => m.truncationId!)
  ), [messages])

  const hiddenCount = useMemo(() => {
    return messages.filter((m) =>
      (m.condenseParent && existingSummaryIds.has(m.condenseParent)) ||
      (m.truncationParent && existingTruncationIds.has(m.truncationParent))
    ).length
  }, [messages, existingSummaryIds, existingTruncationIds])

  const filteredMessages = useMemo(() => {
    if (!filterCondensed) return messages

    return messages.filter((m) => {
      if (m.condenseParent && existingSummaryIds.has(m.condenseParent)) {
        return false
      }
      if (m.truncationParent && existingTruncationIds.has(m.truncationParent)) {
        return false
      }
      return true
    })
  }, [messages, filterCondensed, existingSummaryIds, existingTruncationIds])

  type HybridItem =
    | { type: 'api'; message: Message; ts: number }
    | { type: 'ui'; uiMsg: UIMessage; ts: number }

  const hybridMessages = useMemo((): HybridItem[] => {
    if (!showUiMessages || !uiMessages) return []
    
    const items: HybridItem[] = []
    
    filteredMessages.forEach((message) => {
      items.push({ type: 'api', message, ts: message.ts })
    })
    
    uiMessages.forEach((uiMsg) => {
      items.push({ type: 'ui', uiMsg, ts: uiMsg.ts })
    })
    
    items.sort((a, b) => a.ts - b.ts)
    
    return items
  }, [showUiMessages, uiMessages, filteredMessages])

  function formatTime(timestamp: number) {
    const date = new Date(timestamp)
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    const dateStr = date.toLocaleDateString()
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const hour12 = hours % 12 || 12
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return `${dateStr}, ${hour12}:${minutes}:${seconds}.${ms} ${ampm}`
  }

  const copyConversation = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2))
    } catch (err) {
      console.error('Failed to copy conversation:', err)
    }
  }, [messages])

  const copyConversationStructure = useCallback(async () => {
    try {
      const structureOnly = messages.map((message) => {
        const contentBlocks = normalizeContent(message.content).map((block) => ({
          type: block.type,
          ...(block.id && { id: block.id }),
          ...(block.name && { name: block.name }),
          ...(block.tool_use_id && { tool_use_id: block.tool_use_id }),
          ...(block.is_error !== undefined && { is_error: block.is_error }),
        }))

        return {
          role: message.role,
          content: contentBlocks,
          ts: message.ts,
          ...(message.isSummary !== undefined && { isSummary: message.isSummary }),
          ...(message.condenseId && { condenseId: message.condenseId }),
          ...(message.condenseParent && { condenseParent: message.condenseParent }),
          ...(message.isTruncationMarker !== undefined && { isTruncationMarker: message.isTruncationMarker }),
          ...(message.truncationId && { truncationId: message.truncationId }),
          ...(message.truncationParent && { truncationParent: message.truncationParent }),
        }
      })

      await navigator.clipboard.writeText(JSON.stringify(structureOnly, null, 2))
    } catch (err) {
      console.error('Failed to copy conversation structure:', err)
    }
  }, [messages])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      })
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
      const atBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsAtBottom(atBottom)
    }
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      if (isInitialLoad.current) {
        scrollToBottom('instant')
        isInitialLoad.current = false
      } else {
        scrollToBottom('smooth')
      }
    }
  }, [messages, isAtBottom, scrollToBottom])

  return (
    <Card className="overflow-hidden bg-background">
      <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between space-y-0 sticky top-0 z-10 bg-background">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Conversation</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              {showUiMessages ? `${hybridMessages.length} items` : `${filteredMessages.length} messages`}
            </Badge>
            {showUiMessages && (
              <Badge className="text-xs font-normal bg-teal-600 text-white hover:bg-teal-700">
                Hybrid
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">{taskId}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {uiMessages && uiMessages.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="ui-toggle" className="text-xs text-muted-foreground cursor-pointer">
                UI
              </Label>
              <Switch
                id="ui-toggle"
                checked={showUiMessages}
                onCheckedChange={setShowUiMessages}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          )}
          {!showUiMessages && hiddenCount > 0 && (
            <Button
              variant={filterCondensed ? "default" : "secondary"}
              size="sm"
              onClick={() => setFilterCondensed(!filterCondensed)}
              className={filterCondensed ? "bg-violet-600 hover:bg-violet-500 text-xs h-7" : "text-xs h-7"}
            >
              {filterCondensed ? `${hiddenCount} Hidden` : `Hide ${hiddenCount}`}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="expand-toggle" className="text-xs text-muted-foreground cursor-pointer">
              Expand
            </Label>
            <Switch
              id="expand-toggle"
              checked={expandAll}
              onCheckedChange={setExpandAll}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7">
                <Copy className="h-3 w-3 mr-1" />
                Copy
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyConversation}>
                Copy Full JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyConversationStructure}>
                Copy Structure Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="p-4 space-y-3"
          >
            {showUiMessages && hybridMessages.length > 0 ? (
              hybridMessages.map((item, index) => {
                if (item.type === 'ui') {
                  const uiMsg = item.uiMsg
                  const msgType = uiMsg.say || uiMsg.ask || 'unknown'
                  
                  const getTypeBadgeClass = () => {
                    switch (msgType) {
                      case 'text': return 'bg-blue-600 text-white hover:bg-blue-700'
                      case 'user_feedback': return 'bg-cyan-600 text-white hover:bg-cyan-700'
                      case 'reasoning': return 'bg-purple-600 text-white hover:bg-purple-700'
                      case 'api_req_started': return 'bg-slate-600 text-white hover:bg-slate-700'
                      case 'completion_result': return 'bg-emerald-600 text-white hover:bg-emerald-700'
                      default: return 'bg-slate-600 text-white hover:bg-slate-700'
                    }
                  }
                  
                  const typeBadgeClass = getTypeBadgeClass()
                  const isUserType = msgType === 'user_feedback'
                  
                  return (
                    <div
                      key={`ui-${uiMsg.ts}-${index}`}
                      className="rounded-md p-4 border bg-background border-border"
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          {isUserType ? (
                            <span className="font-medium text-sm text-foreground">User</span>
                          ) : (
                            <Badge className={`text-xs ${typeBadgeClass}`}>
                              {msgType}
                            </Badge>
                          )}
                          <Badge className="text-xs bg-teal-600 text-white hover:bg-teal-700">
                            UI
                          </Badge>
                          {uiMsg.partial && (
                            <Badge className="text-xs bg-amber-600 text-white hover:bg-amber-700">
                              partial
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(uiMsg.ts)}
                        </span>
                      </div>
                      
                      {uiMsg.text && (
                        <UIMessageContentBlock
                          text={uiMsg.text}
                          expanded={expandAll}
                          badgeClass={typeBadgeClass}
                        />
                      )}
                    </div>
                  )
                } else {
                  const message = item.message
                  return (
                    <div
                      key={`api-${message.ts}-${index}`}
                      className={`rounded-md p-4 border ${
                        message.isSummary
                          ? 'bg-violet-950/40 border-violet-800/50'
                          : message.isTruncationMarker
                            ? 'bg-orange-950/40 border-orange-800/50'
                            : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${
                            message.isSummary
                              ? 'text-violet-400'
                              : message.isTruncationMarker
                                ? 'text-orange-400'
                                : message.role === 'user' ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {message.isSummary
                              ? <><ClipboardList className="h-4 w-4 inline mr-1" />Summary</>
                              : message.isTruncationMarker
                                ? <><Scissors className="h-4 w-4 inline mr-1" />Truncation</>
                                : message.role === 'user' ? <><User className="h-4 w-4 inline mr-1" />User</> : <><Bot className="h-4 w-4 inline mr-1" />Assistant</>}
                          </span>
                          <Badge className="text-xs bg-blue-600 text-white hover:bg-blue-700">
                            API
                          </Badge>
                          {message.condenseId && (
                            <Badge className="text-xs bg-violet-600 text-white hover:bg-violet-700">
                              condense: {message.condenseId.slice(0, 8)}…
                            </Badge>
                          )}
                          {message.truncationId && (
                            <Badge className="text-xs bg-orange-600 text-white hover:bg-orange-700">
                              truncation: {message.truncationId.slice(0, 8)}…
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.ts)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {normalizeContent(message.content).map((block, blockIndex) => (
                          <MessageBlock
                            key={blockIndex}
                            block={block}
                            expanded={expandAll}
                            hasMissingResult={block.type === 'tool_use' && block.id ? toolUsesMissingResults.has(block.id) : false}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }
              })
            ) : (
              filteredMessages.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-md p-4 border ${
                    message.isSummary
                      ? 'bg-violet-950/40 border-violet-800/50'
                      : message.isTruncationMarker
                        ? 'bg-orange-950/40 border-orange-800/50'
                        : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        message.isSummary
                          ? 'text-violet-400'
                          : message.isTruncationMarker
                            ? 'text-orange-400'
                            : message.role === 'user' ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {message.isSummary
                          ? <><ClipboardList className="h-4 w-4 inline mr-1" />Summary</>
                          : message.isTruncationMarker
                            ? <><Scissors className="h-4 w-4 inline mr-1" />Truncation</>
                            : message.role === 'user' ? <><User className="h-4 w-4 inline mr-1" />User</> : <><Bot className="h-4 w-4 inline mr-1" />Assistant</>}
                      </span>
                      {message.condenseId && (
                        <Badge className="text-xs bg-violet-600 text-white hover:bg-violet-700">
                          condense: {message.condenseId.slice(0, 8)}…
                        </Badge>
                      )}
                      {message.truncationId && (
                        <Badge className="text-xs bg-orange-600 text-white hover:bg-orange-700">
                          truncation: {message.truncationId.slice(0, 8)}…
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.ts)}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {normalizeContent(message.content).map((block, blockIndex) => (
                      <MessageBlock
                        key={blockIndex}
                        block={block}
                        expanded={expandAll}
                        hasMissingResult={block.type === 'tool_use' && block.id ? toolUsesMissingResults.has(block.id) : false}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {!isAtBottom && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-6 rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
