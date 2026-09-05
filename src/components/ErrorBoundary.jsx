import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Ostatnia linia obrony: zamiast białego ekranu pokazuje komunikat
// i pozwala wyczyścić zapisany stan, który mógł być przyczyną awarii.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Błąd renderowania:', error, info)
  }

  handleReset = () => {
    try {
      window.localStorage.removeItem('oze:turbine')
      window.localStorage.removeItem('oze:location')
    } catch {
      /* tryb prywatny — i tak przeładowujemy */
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid h-screen place-items-center p-6">
        <div className="glass max-w-md space-y-4 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-rose-300">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-50">Coś poszło nie tak</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Aplikacja napotkała nieoczekiwany błąd. Najczęstsza przyczyna to uszkodzone
              ustawienia zapisane w przeglądarce.
            </p>
          </div>
          <p className="rounded-lg bg-black/30 px-3 py-2 text-left font-mono text-[11px] text-rose-200">
            {this.state.error?.message ?? String(this.state.error)}
          </p>
          <button type="button" onClick={this.handleReset} className="glass-btn glass-btn-primary w-full">
            <RotateCcw size={15} /> Przywróć ustawienia domyślne
          </button>
        </div>
      </div>
    )
  }
}
