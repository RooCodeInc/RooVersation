import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { getBadgeVariant } from '@/lib/block-styles'

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
  source?: {
    type: string
    media_type?: string
    data?: string
  }
}

interface MessageBlockProps {
  block: ContentBlock
  expanded: boolean
  hasMissingResult?: boolean
}

export default function MessageBlock({ block, expanded: initialExpanded, hasMissingResult }: MessageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  useEffect(() => {
    setIsExpanded(initialExpanded)
  }, [initialExpanded])

  function getPreviewText(): string {
    const maxLength = 100
    let text = ''
    
    switch (block.type) {
      case 'text':
      case 'reasoning':
        text = block.text || ''
        break
      case 'tool_use':
        text = block.input ? JSON.stringify(block.input) : ''
        break
      case 'tool_result':
        text = block.content || ''
        break
      case 'image':
        return '[image]'
      default:
        text = JSON.stringify(block)
    }
    
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return cleaned.slice(0, maxLength) + '…'
  }

  function renderBlockHeader() {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={getBadgeVariant(block.type)} className="text-xs font-medium shrink-0">
          {block.type}
        </Badge>
        {block.name && (
          <span className="text-sm font-mono text-foreground/80 shrink-0">{block.name}</span>
        )}
        {block.id && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">{block.id}</span>
        )}
        {block.tool_use_id && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">ref: {block.tool_use_id}</span>
        )}
        {block.is_error && (
          <Badge variant="destructive" className="text-xs font-medium shrink-0">
            Error
          </Badge>
        )}
        {hasMissingResult && (
          <Badge className="text-xs font-medium bg-orange-900/40 text-orange-400 hover:bg-orange-900/50 flex items-center gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            Missing Result
          </Badge>
        )}
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
    )
  }

  function renderContent() {
    switch (block.type) {
      case 'text':
        return (
          <div className="message-content mt-2">
            <pre className="text-sm text-foreground/90 whitespace-pre-wrap break-words bg-background p-3 rounded border border-border">
              {block.text}
            </pre>
          </div>
        )

      case 'reasoning':
        return (
          <div className="message-content mt-2">
            <pre className="text-sm text-violet-200 whitespace-pre-wrap break-words bg-violet-950/40 p-3 rounded border border-violet-800/50">
              {block.text}
            </pre>
            {block.summary && block.summary.length > 0 && (
              <div className="mt-2 p-2 bg-violet-950/50 rounded border border-violet-800/50">
                <div className="text-xs font-semibold text-violet-400 mb-1">Summary:</div>
                <ul className="list-disc list-inside text-sm text-violet-300">
                  {block.summary.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )

      case 'tool_use':
        return (
          <div className="message-content mt-2">
            <div className="bg-amber-950/40 p-3 rounded border border-amber-800/50">
              <div className="text-sm font-semibold text-amber-400 mb-2">
                Tool: {block.name}
              </div>
              {block.input && (
                <div>
                  <div className="text-xs text-amber-400/80 mb-1">Input:</div>
                  <SyntaxHighlighter
                    language="json"
                    style={{
                      ...vscDarkPlus,
                      'pre[class*="language-"]': {
                        ...vscDarkPlus['pre[class*="language-"]'],
                        background: 'hsl(var(--background))',
                      },
                      'code[class*="language-"]': {
                        ...vscDarkPlus['code[class*="language-"]'],
                        background: 'transparent',
                      },
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      background: 'hsl(var(--background))',
                      overflow: 'hidden',
                    }}
                    wrapLongLines
                    codeTagProps={{
                      style: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        background: 'transparent',
                      }
                    }}
                  >
                    {JSON.stringify(block.input, null, 2)}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          </div>
        )

      case 'tool_result':
        return (
          <div className="message-content mt-2">
            <div className={`p-3 rounded border ${
              block.is_error
                ? 'bg-destructive/20 border-destructive/50'
                : 'bg-sky-950/40 border-sky-800/50'
            }`}>
              <pre className={`text-sm whitespace-pre-wrap break-words ${
                block.is_error ? 'text-destructive-foreground' : 'text-foreground/90'
              }`}>
                {block.content}
              </pre>
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="message-content mt-2">
            {block.source?.data ? (
              <img
                src={`data:${block.source.media_type};base64,${block.source.data}`}
                alt="Embedded image"
                className="max-w-full h-auto rounded border border-border"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Image data not available</div>
            )}
          </div>
        )

      default:
        return (
          <div className="message-content mt-2">
            <pre className="text-xs text-foreground/80 bg-background p-3 rounded overflow-x-auto border border-border">
              {JSON.stringify(block, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="border border-border rounded p-3 bg-muted"
    >
      <CollapsibleTrigger className="w-full text-left hover:bg-muted/80 -m-3 p-3 rounded transition-colors">
        {renderBlockHeader()}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {renderContent()}
      </CollapsibleContent>
    </Collapsible>
  )
}
