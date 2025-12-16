import { useState, useRef } from 'react'
import type { ContentBlock, TestTool } from '../types'
import { generateId } from '../types'
import { generateSampleToolInput } from '../testTools'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { X, ChevronDown, ChevronRight, Dices, Upload } from 'lucide-react'
import { getBadgeVariant } from '@/lib/block-styles'

interface MessageBlockEditorProps {
  block: ContentBlock
  onUpdate: (block: ContentBlock) => void
  onDelete: () => void
  selectedTools: TestTool[]
}

export default function MessageBlockEditor({ block, onUpdate, onDelete, selectedTools }: MessageBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          <Textarea
            value={block.text || ''}
            onChange={(e) => onUpdate({ ...block, text: e.target.value })}
            className="min-h-[80px] resize-y text-sm bg-background"
            placeholder="Enter text content..."
          />
        )

      case 'reasoning':
        return (
          <div className="space-y-3">
            <Textarea
              value={block.text || ''}
              onChange={(e) => onUpdate({ ...block, text: e.target.value })}
              className="min-h-[80px] resize-y text-sm bg-violet-950/40 border-violet-800/50"
              placeholder="Enter reasoning content..."
            />
            <div>
              <Label className="text-xs text-foreground">Summary (one per line)</Label>
              <Textarea
                value={(block.summary || []).join('\n')}
                onChange={(e) => onUpdate({ ...block, summary: e.target.value.split('\n').filter(Boolean) })}
                className="min-h-[60px] resize-y text-sm bg-violet-950/40 border-violet-800/50 mt-1"
                placeholder="Summary points..."
              />
            </div>
          </div>
        )

      case 'tool_use':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-foreground">Tool Name</Label>
                <Select
                  value={block.name || ''}
                  onValueChange={(value) => {
                    const tool = selectedTools.find(t => t.name === value)
                    onUpdate({
                      ...block,
                      name: value,
                      input: tool ? generateSampleToolInput(tool) : {}
                    })
                  }}
                >
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue placeholder="Select a tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTools.map(tool => (
                      <SelectItem key={tool.name} value={tool.name}>
                        {tool.name}
                      </SelectItem>
                    ))}
                    {block.name && !selectedTools.find(t => t.name === block.name) && (
                      <SelectItem value={block.name}>{block.name} (custom)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-xs text-foreground">ID</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={block.id || ''}
                    onChange={(e) => onUpdate({ ...block, id: e.target.value })}
                    className="flex-1 h-8 text-xs font-mono bg-background"
                    placeholder="toolu_..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdate({ ...block, id: generateId() })}
                    className="h-8 w-8"
                    title="Generate new ID"
                  >
                    <Dices className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-foreground">Input (JSON)</Label>
              <Textarea
                value={JSON.stringify(block.input || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    onUpdate({ ...block, input: parsed })
                  } catch {
                    // Keep the text but don't update if invalid JSON
                  }
                }}
                className="min-h-[100px] resize-y text-xs font-mono mt-1 bg-background"
                placeholder="{}"
              />
            </div>
          </div>
        )

      case 'tool_result':
        return (
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs text-foreground">Tool Use ID (reference)</Label>
                <Input
                  value={block.tool_use_id || ''}
                  onChange={(e) => onUpdate({ ...block, tool_use_id: e.target.value })}
                  className="h-8 text-sm font-mono mt-1 bg-background"
                  placeholder="toolu_..."
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Checkbox
                  id={`error-${block.tool_use_id}`}
                  checked={block.is_error || false}
                  onCheckedChange={(checked) => onUpdate({ ...block, is_error: checked === true })}
                />
                <Label htmlFor={`error-${block.tool_use_id}`} className="text-xs text-destructive cursor-pointer">
                  Error
                </Label>
              </div>
            </div>
            <div>
              <Label className="text-xs text-foreground">Content</Label>
              <Textarea
                value={block.content || ''}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                className={`min-h-[80px] resize-y text-sm mt-1 ${
                  block.is_error
                    ? 'bg-destructive/20 border-destructive/50 text-destructive-foreground'
                    : 'bg-background'
                }`}
                placeholder="Tool result content..."
              />
            </div>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Image
              </Button>
              <span className="text-xs text-muted-foreground">
                {block.source?.media_type || 'No image selected'}
              </span>
            </div>
            
            {block.source?.data && (
              <div className="space-y-2">
                <img
                  src={`data:${block.source.media_type};base64,${block.source.data}`}
                  alt="Preview"
                  className="max-w-full max-h-48 rounded border border-border"
                />
                <div className="text-xs text-muted-foreground">
                  Base64 data: {block.source.data.length} characters
                </div>
              </div>
            )}
            
            <div>
              <Label className="text-xs text-foreground">Or paste Base64 data directly</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={block.source?.media_type || ''}
                  onChange={(e) => onUpdate({
                    ...block,
                    source: { ...block.source, type: 'base64', media_type: e.target.value }
                  })}
                  className="w-32 h-8 text-xs bg-background"
                  placeholder="image/png"
                />
                <Input
                  value={block.source?.data || ''}
                  onChange={(e) => onUpdate({
                    ...block,
                    source: { ...block.source, type: 'base64', data: e.target.value }
                  })}
                  className="flex-1 h-8 text-xs font-mono bg-background"
                  placeholder="Base64 encoded image data..."
                />
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div>
            <Label className="text-xs">Raw JSON</Label>
            <Textarea
              value={JSON.stringify(block, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onUpdate(parsed)
                } catch {
                  // Keep the text but don't update if invalid JSON
                }
              }}
              className="min-h-[100px] resize-y text-xs font-mono mt-1 bg-background"
            />
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
      <div className="flex items-center gap-2">
        <Badge variant={getBadgeVariant(block.type)} className="text-xs font-medium">
          {block.type}
        </Badge>
        
        <Select
          value={block.type}
          onValueChange={(newType) => {
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
        >
          <SelectTrigger className="h-6 w-auto text-xs bg-background/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">text</SelectItem>
            <SelectItem value="tool_use">tool_use</SelectItem>
            <SelectItem value="tool_result">tool_result</SelectItem>
            <SelectItem value="reasoning">reasoning</SelectItem>
            <SelectItem value="image">image</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-1" />
        
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-6 w-6 text-destructive hover:text-destructive"
          title="Delete block"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <CollapsibleContent className="mt-3">
        {renderEditor()}
      </CollapsibleContent>
    </Collapsible>
  )
}
