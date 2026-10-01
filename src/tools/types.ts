import type { IconName } from '../components/icons'

export const toolCategories = ['generators', 'time', 'converters'] as const
export type ToolCategory = (typeof toolCategories)[number]
export type ToolStatus = 'available'

export interface ToolDefinition {
  id: string
  nameKey: string
  descriptionKey: string
  keywordsKey: string
  category: ToolCategory
  icon: IconName
  route: string
  status: ToolStatus
}
