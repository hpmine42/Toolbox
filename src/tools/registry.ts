import type { ToolDefinition } from './types'

export const tools: readonly ToolDefinition[] = [
  {
    id: 'random-number',
    nameKey: 'tools.randomNumber.name',
    descriptionKey: 'tools.randomNumber.description',
    keywordsKey: 'tools.randomNumber.keywords',
    category: 'generators',
    icon: 'dice',
    route: '/tools/random-number',
    status: 'available',
  },
  {
    id: 'timer',
    nameKey: 'tools.timer.name',
    descriptionKey: 'tools.timer.description',
    keywordsKey: 'tools.timer.keywords',
    category: 'time',
    icon: 'timer',
    route: '/tools/timer',
    status: 'available',
  },
  {
    id: 'unit-converter',
    nameKey: 'tools.unitConverter.name',
    descriptionKey: 'tools.unitConverter.description',
    keywordsKey: 'tools.unitConverter.keywords',
    category: 'converters',
    icon: 'ruler',
    route: '/tools/unit-converter',
    status: 'available',
  },
  {
    id: 'outdoor-tracker',
    nameKey: 'tools.outdoorTracker.name',
    descriptionKey: 'tools.outdoorTracker.description',
    keywordsKey: 'tools.outdoorTracker.keywords',
    category: 'time',
    icon: 'leaf',
    route: '/tools/outdoor-tracker',
    status: 'available',
  },
]

export function getTool(id: string | undefined): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === id)
}
