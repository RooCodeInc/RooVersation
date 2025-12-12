import type { TestTool } from './types'

export const TEST_TOOLS: TestTool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_to_file',
    description: 'Write content to a file at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'apply_diff',
    description: 'Apply a diff to modify an existing file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to modify'
        },
        diff: {
          type: 'string',
          description: 'The diff content to apply'
        }
      },
      required: ['path', 'diff']
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        },
        cwd: {
          type: 'string',
          description: 'The working directory for the command'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'list_files',
    description: 'List files and directories at the specified path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list'
        },
        recursive: {
          type: 'string',
          description: 'Whether to list recursively (true/false)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory to search in'
        },
        regex: {
          type: 'string',
          description: 'The regex pattern to search for'
        },
        file_pattern: {
          type: 'string',
          description: 'Glob pattern to filter files'
        }
      },
      required: ['path', 'regex']
    }
  },
  {
    name: 'ask_followup_question',
    description: 'Ask the user a follow-up question',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask'
        },
        follow_up: {
          type: 'string',
          description: 'JSON array of suggested follow-up answers'
        }
      },
      required: ['question', 'follow_up']
    }
  },
  {
    name: 'attempt_completion',
    description: 'Mark the task as complete with a result message',
    input_schema: {
      type: 'object',
      properties: {
        result: {
          type: 'string',
          description: 'The completion result message'
        }
      },
      required: ['result']
    }
  },
  {
    name: 'browser_action',
    description: 'Perform a browser action',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The browser action to perform',
          enum: ['launch', 'click', 'type', 'scroll_down', 'scroll_up', 'close']
        },
        url: {
          type: 'string',
          description: 'URL to navigate to (for launch action)'
        },
        coordinate: {
          type: 'string',
          description: 'X,Y coordinates for click action'
        },
        text: {
          type: 'string',
          description: 'Text to type (for type action)'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'update_todo_list',
    description: 'Update the task todo list',
    input_schema: {
      type: 'object',
      properties: {
        todos: {
          type: 'string',
          description: 'Markdown checklist of todos'
        }
      },
      required: ['todos']
    }
  },
  {
    name: 'new_task',
    description: 'Create a new task in a specified mode',
    input_schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'The mode slug for the new task'
        },
        message: {
          type: 'string',
          description: 'Initial message for the new task'
        }
      },
      required: ['mode', 'message']
    }
  },
  {
    name: 'switch_mode',
    description: 'Switch to a different mode',
    input_schema: {
      type: 'object',
      properties: {
        mode_slug: {
          type: 'string',
          description: 'The slug of the mode to switch to'
        },
        reason: {
          type: 'string',
          description: 'Reason for switching modes'
        }
      },
      required: ['mode_slug', 'reason']
    }
  }
]

export function getToolByName(name: string): TestTool | undefined {
  return TEST_TOOLS.find(tool => tool.name === name)
}

export function generateSampleToolInput(tool: TestTool): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  
  for (const [key, schema] of Object.entries(tool.input_schema.properties)) {
    if (schema.enum) {
      input[key] = schema.enum[0]
    } else if (schema.type === 'string') {
      input[key] = `sample_${key}`
    } else if (schema.type === 'number') {
      input[key] = 0
    } else if (schema.type === 'boolean') {
      input[key] = false
    }
  }
  
  return input
}

export function generateSampleToolResult(toolName: string, isError: boolean = false): string {
  if (isError) {
    return `Error: Failed to execute ${toolName}`
  }
  
  const sampleResults: Record<string, string> = {
    read_file: 'File contents here...\nLine 2\nLine 3',
    write_to_file: 'File written successfully',
    apply_diff: 'Diff applied successfully',
    execute_command: '$ command output\nExecuted successfully',
    list_files: 'file1.ts\nfile2.ts\nfolder/',
    search_files: 'Found 3 matches:\nfile1.ts:10: match\nfile2.ts:25: match',
    ask_followup_question: '',
    attempt_completion: '',
    browser_action: 'Browser action completed',
    update_todo_list: 'Todo list updated',
    new_task: 'New task created',
    switch_mode: 'Mode switched successfully'
  }
  
  return sampleResults[toolName] || 'Tool executed successfully'
}
