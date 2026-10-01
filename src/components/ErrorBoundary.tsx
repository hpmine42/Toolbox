import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="state-panel" role="alert">
      <h2>{t('states.errorTitle')}</h2>
      <p>{t('states.errorBody')}</p>
      <button type="button" className="button button-primary" onClick={onRetry}>
        {t('states.retry')}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) return <ErrorFallback onRetry={this.reset} />
    return this.props.children
  }
}
