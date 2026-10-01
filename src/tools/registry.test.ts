import { describe, expect, it } from 'vitest'
import { toolModules } from './modules'
import { tools } from './registry'
import { toolCategories } from './types'

describe('tool registry', () => {
  it('gives every available tool one module and a stable route', () => {
    const ids = tools.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(toolModules).sort()).toEqual([...ids].sort())
    for (const tool of tools) {
      expect(tool.status).toBe('available')
      expect(tool.route).toBe(`/tools/${tool.id}`)
      expect(toolCategories).toContain(tool.category)
    }
  })
})
