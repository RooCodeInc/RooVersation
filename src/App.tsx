import { useState, useEffect, useRef } from 'react'
import TaskList from './components/TaskList'
import ConversationView from './components/ConversationView'
import ConversationBuilder from './components/ConversationBuilder'
import type { Task, Message, UIMessage } from './types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BookOpen, Hammer, Upload, AlertCircle } from 'lucide-react'

type Source = 'nightly' | 'production'
type AppMode = 'viewer' | 'builder'

function getStoredSource(): Source {
  const stored = localStorage.getItem('convo-viewer-source')
  return stored === 'production' ? 'production' : 'nightly'
}

function getStoredMode(): AppMode {
  const stored = localStorage.getItem('convo-viewer-mode')
  return stored === 'builder' ? 'builder' : 'viewer'
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(getStoredMode)
  const [source, setSource] = useState<Source>(getStoredSource)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Message[] | null>(null)
  const [uiMessages, setUiMessages] = useState<UIMessage[] | null>(null)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [previewConversation, setPreviewConversation] = useState<Message[] | null>(null)
  const [builderMessages, setBuilderMessages] = useState<(Message & { _id: string })[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('convo-viewer-mode', mode)
  }, [mode])

  useEffect(() => {
    if (mode === 'viewer') {
      loadTasks()
    }
  }, [source, mode])

  useEffect(() => {
    if (mode !== 'viewer') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/${source}`)
        if (!res.ok) return
        const data: Task[] = await res.json()
        
        setTasks(prevTasks => {
          const existingIds = new Set(prevTasks.map(t => t.id))
          const newTasks = data.filter(t => !existingIds.has(t.id))
          
          if (newTasks.length === 0) {
            const updatedTasks = prevTasks.map(prevTask => {
              const updated = data.find(t => t.id === prevTask.id)
              return updated ? { ...prevTask, timestamp: updated.timestamp } : prevTask
            })
            updatedTasks.sort((a, b) => b.timestamp - a.timestamp)
            return updatedTasks
          }
          
          const mergedTasks = [...newTasks, ...prevTasks]
          mergedTasks.sort((a, b) => b.timestamp - a.timestamp)
          return mergedTasks
        })
      } catch {
        // Silently ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [source, mode])

  useEffect(() => {
    if (!selectedTask || mode !== 'viewer') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/task/${source}/${selectedTask}`)
        if (!res.ok) return
        const data = await res.json()
        setConversation(data.apiConversation)
        setUiMessages(data.uiMessages)
      } catch {
        // Silently ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [selectedTask, source, mode])

  async function loadTasks() {
    setLoadingTasks(true)
    setError(null)
    setSelectedTask(null)
    setConversation(null)
    setUiMessages(null)
    
    try {
      const res = await fetch(`/api/tasks/${source}`)
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data)
    } catch {
      setError('Failed to load tasks. Make sure the server is running.')
    } finally {
      setLoadingTasks(false)
    }
  }

  async function loadConversation(taskId: string) {
    if (loadingConversation) return
    
    setLoadingConversation(true)
    setError(null)
    setSelectedTask(taskId)
    setConversation(null)
    setUiMessages(null)
    
    try {
      const res = await fetch(`/api/task/${source}/${taskId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Conversation not found. The task may have been deleted.')
          setSelectedTask(null)
          loadTasks()
          return
        }
        throw new Error('Failed to load conversation')
      }
      const data = await res.json()
      setConversation(data.apiConversation)
      setUiMessages(data.uiMessages)
    } catch {
      setError('Failed to load conversation')
      setSelectedTask(null)
    } finally {
      setLoadingConversation(false)
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLoadingConversation(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        if (Array.isArray(data)) {
          setConversation(data)
          setUiMessages(null)
          setSelectedTask(null)
          setUploadedFileName(file.name)
        } else {
          setError('Invalid file format. Expected an array of messages.')
        }
      } catch {
        setError('Failed to parse JSON file.')
      } finally {
        setLoadingConversation(false)
      }
    }
    reader.onerror = () => {
      setError('Failed to read file.')
      setLoadingConversation(false)
    }
    reader.readAsText(file)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handlePreviewFromBuilder(messages: Message[]) {
    setPreviewConversation(messages)
  }

  function handleModeChange(newMode: string) {
    const appMode = newMode as AppMode
    setMode(appMode)
    if (appMode === 'builder') {
      setSelectedTask(null)
      setConversation(null)
      setUploadedFileName(null)
    } else {
      setPreviewConversation(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">RooVersation</h1>
              
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => value && handleModeChange(value)}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem
                  value="viewer"
                  aria-label="Viewer mode"
                  className="data-[state=on]:bg-background data-[state=on]:text-foreground px-4 py-1.5 text-sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Viewer
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="builder"
                  aria-label="Builder mode"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4 py-1.5 text-sm"
                >
                  <Hammer className="h-4 w-4 mr-2" />
                  Builder
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="flex items-center gap-4">
              {mode === 'viewer' && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Source:</span>
                    <Select
                      value={source}
                      onValueChange={(value: Source) => {
                        localStorage.setItem('convo-viewer-source', value)
                        setSource(value)
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nightly">Nightly</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === 'viewer' ? (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              {loadingTasks ? (
                <div className="bg-card rounded-lg shadow-lg p-8 text-center text-muted-foreground border border-border">
                  Loading tasks...
                </div>
              ) : (
                <TaskList
                  tasks={tasks}
                  selectedTask={selectedTask}
                  onSelectTask={loadConversation}
                  disabled={loadingConversation}
                />
              )}
            </div>
            <div className="col-span-8">
              {loadingConversation ? (
                <div className="bg-card rounded-lg shadow-lg p-8 text-center text-muted-foreground border border-border">
                  <div className="animate-pulse">Loading conversation...</div>
                </div>
              ) : conversation ? (
                <ConversationView
                  messages={conversation}
                  uiMessages={uiMessages}
                  taskId={selectedTask ?? uploadedFileName ?? 'uploaded'}
                  onClose={() => {
                    setConversation(null)
                    setUiMessages(null)
                    setSelectedTask(null)
                    setUploadedFileName(null)
                  }}
                />
              ) : (
                <div className="bg-card rounded-lg shadow-lg p-8 text-center text-muted-foreground border border-border">
                  Select a task to view the conversation
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {previewConversation ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewConversation(null)}
                  >
                    ← Back to Builder
                  </Button>
                  <span className="text-muted-foreground text-sm">Preview Mode</span>
                </div>
                <ConversationView
                  messages={previewConversation}
                  taskId="preview"
                  onClose={() => setPreviewConversation(null)}
                />
              </div>
            ) : (
              <ConversationBuilder
                onPreview={handlePreviewFromBuilder}
                messages={builderMessages}
                onMessagesChange={setBuilderMessages}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
