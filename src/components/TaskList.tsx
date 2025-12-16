import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  timestamp: number
  firstMessage: string
}

interface TaskListProps {
  tasks: Task[]
  selectedTask: string | null
  onSelectTask: (id: string) => void
  disabled?: boolean
}

export default function TaskList({ tasks, selectedTask, onSelectTask, disabled = false }: TaskListProps) {
  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          Tasks
          <Badge variant="secondary" className="text-xs font-normal">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="divide-y divide-border">
            {tasks.length === 0 ? (
              <div className="p-4 text-muted-foreground text-center text-sm">
                No tasks found
              </div>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => !disabled && onSelectTask(task.id)}
                  disabled={disabled}
                  className={`w-full text-left p-4 transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                  } ${
                    selectedTask === task.id ? 'bg-muted border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {formatDate(task.timestamp)}
                  </div>
                  <div className="text-sm text-foreground line-clamp-3">
                    {task.firstMessage}
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-1 font-mono truncate">
                    {task.id}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
