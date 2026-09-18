import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import i18n from '@/i18n'

interface State {
  error: Error | null
}

/**
 * A crash in one screen shows a way out instead of a blank page. Cleared when the route changes, so going back or
 * elsewhere works again.
 */
class Boundary extends Component<{ children: ReactNode; resetKey: string }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="glass-strong w-full max-w-sm rounded-[2rem] p-8 text-center">
          <h1 className="text-2xl">{i18n.t('errors.crashTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{i18n.t('errors.crashBody')}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--coral),var(--primary)_60%)] font-semibold text-white"
          >
            <RotateCcw className="size-4" />
            {i18n.t('errors.reload')}
          </button>
        </div>
      </div>
    )
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <Boundary resetKey={pathname}>{children}</Boundary>
}
