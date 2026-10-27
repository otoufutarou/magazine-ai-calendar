import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchJoke, JokeError } from './jokes'
import type { Joke } from './jokes'
import './App.css'

type State =
  | { status: 'loading' }
  | { status: 'success'; joke: Joke }
  | { status: 'error'; message: string }

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [revealed, setRevealed] = useState(false)
  const request = useRef<AbortController | null>(null)

  const loadJoke = useCallback(async () => {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    let timedOut = false
    const timer = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 10_000)

    try {
      const joke = await fetchJoke(controller.signal)
      if (request.current === controller) setState({ status: 'success', joke })
    } catch (error) {
      if (request.current !== controller) return
      setState({
        status: 'error',
        message: timedOut
          ? '取得に時間がかかっています。少し待ってから、もう一度お試しください。'
          : error instanceof JokeError
            ? error.message
            : '接続できませんでした。通信環境を確認して、もう一度お試しください。',
      })
    } finally {
      window.clearTimeout(timer)
      if (request.current === controller) request.current = null
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- State updates occur only after the fetch settles.
    void loadJoke()
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [loadJoke])

  return (
    <div className="page">
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="ひと笑い ホーム">
          <span className="brand-icon" aria-hidden="true">☺</span>ひと笑い
        </a>
        <span className="header-note">気分転換に、ほんの少し。</span>
      </header>
      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow"><span aria-hidden="true" />今日の小さな息抜き</p>
          <h1 id="page-title">ひと息、<br className="mobile-break" />ひと笑い。</h1>
          <p className="intro-copy">忙しい毎日に、ちょっとしたユーモアを。<br />世界のジョークを、ひとつずつ。</p>
        </section>
        <section className="joke-card" aria-label="ランダムジョーク" aria-busy={state.status === 'loading'}>
          <div className="card-top">
            <span className="pill">英語のジョーク</span>
            <span className="card-decoration" aria-hidden="true">✳</span>
          </div>
          <div className="joke-content">
            {state.status === 'loading' && (
              <div className="loading-placeholder" aria-hidden="true"><span /><span /><span /></div>
            )}
            {state.status === 'success' && (
              <div className="joke-text" lang="en">
                <p>{state.joke.type === 'single' ? state.joke.joke : state.joke.setup}</p>
                {state.joke.type === 'twopart' && (
                  <p className="punchline" id="punchline" hidden={!revealed}>{state.joke.delivery}</p>
                )}
              </div>
            )}
            {state.status === 'error' && (
              <div className="error-message">
                <h2>ひと休みして、もう一度。</h2>
                <p>{state.message}</p>
              </div>
            )}
          </div>
          {state.status === 'success' && state.joke.type === 'twopart' && (
            <button className="reveal-button" aria-expanded={revealed} aria-controls="punchline" onClick={() => setRevealed(!revealed)}>
              {revealed ? 'オチを隠す' : 'オチを見る'} <span aria-hidden="true">{revealed ? '−' : '＋'}</span>
            </button>
          )}
          <div className="card-bottom"><span aria-hidden="true">◌</span>提供元：JokeAPI · 原文は英語です</div>
        </section>
        <div className="actions">
          <button className="primary-button" onClick={() => {
            if (request.current) return
            setState({ status: 'loading' })
            setRevealed(false)
            void loadJoke()
          }} disabled={state.status === 'loading'}>
            <span className={state.status === 'loading' ? 'spinner' : ''} aria-hidden="true">↻</span>
            {state.status === 'loading' ? 'ジョークを探しています' : state.status === 'error' ? 'もう一度試す' : '別のジョークを読む'}
          </button>
          <p className="status" role="status" aria-live="polite" aria-atomic="true">
            {state.status === 'loading'
              ? '新しいジョークを取得しています…'
              : state.status === 'error'
                ? state.message
                : state.joke.type === 'twopart' && !revealed
                  ? 'まずは前振りを。準備ができたら、オチをどうぞ。'
                  : '少しでも、気分が軽くなりますように。'}
          </p>
        </div>
      </main>
      <footer>
        <p>笑いのセンスも、世界いろいろ。</p>
        <p>不適切な内容を除く設定で取得していますが、完全な除外は保証されません。</p>
        <a href="https://v2.jokeapi.dev/" target="_blank" rel="noreferrer">提供元・API仕様 <span className="sr-only">（新しいタブで開きます）</span><span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  )
}
