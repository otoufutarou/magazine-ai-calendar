import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchJoke, JOKE_URL } from './jokes'

const single = {
  error: false,
  lang: 'en',
  safe: true,
  flags: { nsfw: false, religious: false, political: false, racist: false, sexist: false, explicit: false },
  type: 'single',
  joke: 'A little test joke.',
}
const twopart = { ...single, type: 'twopart', setup: 'A test setup?', delivery: 'The test punchline.' }
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ジョーク画面', () => {
  it('initially loads once, blocks concurrent clicks, then renders a single joke', async () => {
    let resolve!: (value: Response) => void
    fetchMock.mockReturnValue(new Promise(done => { resolve = done }))
    render(<App />)
    const button = screen.getByRole('button', { name: 'ジョークを探しています' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('取得しています')
    fireEvent.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => { resolve(response(single)) })
    expect(await screen.findByText(single.joke)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'オチを見る' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(JOKE_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('reveals and hides the punchline, resetting the reveal for another joke', async () => {
    fetchMock.mockImplementation(async () => response(twopart))
    render(<App />)
    await screen.findByText(twopart.setup)
    const punchline = screen.getByText(twopart.delivery)
    expect(punchline.hidden).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'オチを見る' }))
    expect(punchline.hidden).toBe(false)
    expect(screen.getByRole('button', { name: 'オチを隠す' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'オチを隠す' }))
    expect(punchline.hidden).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'オチを見る' }))
    fireEvent.click(screen.getByRole('button', { name: '別のジョークを読む' }))
    await screen.findByRole('button', { name: 'オチを見る' })
    expect(screen.getByText(twopart.delivery).hidden).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows a network error and recovers through retry', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable')).mockResolvedValueOnce(response(single))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'もう一度試す' }))
    expect(await screen.findByText(single.joke)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('aborts after ten seconds and permits retry', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      signal = init?.signal as AbortSignal
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })).mockResolvedValueOnce(response(single))
    render(<App />)
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(signal?.aborted).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('時間がかかっています')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'もう一度試す' })) })
    expect(screen.getByText(single.joke)).toBeTruthy()
  })

  it('cancels on unmount', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { unmount } = render(<App />)
    const signal = fetchMock.mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('ignores stale responses after StrictMode cleanup', async () => {
    let resolveStale!: (value: Response) => void
    fetchMock.mockReturnValueOnce(new Promise(done => { resolveStale = done }))
      .mockResolvedValueOnce(response(single))
    render(<StrictMode><App /></StrictMode>)
    expect(await screen.findByText(single.joke)).toBeTruthy()
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await act(async () => { resolveStale(response({ ...single, joke: 'Stale content' })) })
    expect(screen.queryByText('Stale content')).toBeNull()
    expect(screen.getByText(single.joke)).toBeTruthy()
  })

  it('renders API text as text, never as HTML', async () => {
    const text = '<img src=x onerror=alert(1)>'
    fetchMock.mockResolvedValue(response({ ...single, joke: text }))
    const { container } = render(<App />)
    expect(await screen.findByText(text)).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows malformed-response feedback with a retry action', async () => {
    fetchMock.mockResolvedValue(response({}))
    render(<App />)
    await screen.findByRole('button', { name: 'もう一度試す' })
    expect(screen.getByRole('status').textContent).toContain('表示できるジョークが届きませんでした')
  })

  it('shows server failure feedback in the live region', async () => {
    fetchMock.mockResolvedValue(response({}, 503))
    render(<App />)
    await screen.findByRole('button', { name: 'もう一度試す' })
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('提供元で問題'))
  })
})

describe('API response validation', () => {
  it.each([
    null, {}, [], { error: true }, { ...single, joke: '' }, { ...single, joke: '  ' },
    { ...single, type: 'unknown' }, { ...twopart, delivery: null }, { ...twopart, setup: 42 },
    { ...single, safe: false }, { ...single, flags: { ...single.flags, nsfw: true } },
    { ...single, flags: {} }, { ...single, lang: 'de' },
  ])('rejects empty, malformed or unsafe responses: %j', async data => {
    fetchMock.mockResolvedValue(response(data))
    await expect(fetchJoke(new AbortController().signal)).rejects.toThrow('表示できるジョーク')
  })

  it.each([429, 500, 404])('handles HTTP %i', async status => {
    fetchMock.mockResolvedValue(response({}, status))
    await expect(fetchJoke(new AbortController().signal)).rejects.toThrow(status === 429 ? 'アクセスが集中' : '提供元で問題')
  })

  it('handles invalid JSON', async () => {
    fetchMock.mockResolvedValue(new Response('not json'))
    await expect(fetchJoke(new AbortController().signal)).rejects.toThrow('読み取れませんでした')
  })

  it('requests English jokes with all safety filters and no credentials', async () => {
    fetchMock.mockResolvedValue(response(single))
    await fetchJoke(new AbortController().signal)
    const url = new URL(JOKE_URL)
    expect(url.searchParams.get('lang')).toBe('en')
    expect(url.searchParams.has('safe-mode')).toBe(true)
    expect(url.searchParams.get('blacklistFlags')?.split(',')).toEqual(Object.keys(single.flags))
    expect(fetchMock.mock.calls[0][1]?.credentials).toBeUndefined()
  })
})
