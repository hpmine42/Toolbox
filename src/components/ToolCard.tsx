import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ToolDefinition } from '../tools/types'
import { Icon } from './icons'

export function ToolCard({ tool, showCategory = true }: { tool: ToolDefinition; showCategory?: boolean }) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()

  return (
    <li>
      <Link className="tool-card" to={tool.route} aria-labelledby={titleId} aria-describedby={descriptionId}>
        <span className="tool-card-icon">
          <Icon name={tool.icon} />
        </span>
        <span className="tool-card-copy">
          <h3 id={titleId}>{t(tool.nameKey)}</h3>
          <p id={descriptionId}>{t(tool.descriptionKey)}</p>
          {showCategory ? <p className="tool-card-meta">{t(`categories.${tool.category}`)}</p> : null}
        </span>
      </Link>
    </li>
  )
}

export function ToolGrid({ tools, showCategory = true }: { tools: readonly ToolDefinition[]; showCategory?: boolean }) {
  return (
    <ul className="tool-grid">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} showCategory={showCategory} />
      ))}
    </ul>
  )
}
