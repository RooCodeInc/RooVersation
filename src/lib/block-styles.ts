export type BlockType = 'text' | 'reasoning' | 'tool_use' | 'tool_result' | 'image'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'text' | 'reasoning' | 'toolUse' | 'toolResult' | 'image'

const badgeVariantMap: Record<string, BadgeVariant> = {
  text: 'text',
  reasoning: 'reasoning',
  tool_use: 'toolUse',
  tool_result: 'toolResult',
  image: 'image',
}

export function getBadgeVariant(type: string): BadgeVariant {
  return badgeVariantMap[type] || 'default'
}
