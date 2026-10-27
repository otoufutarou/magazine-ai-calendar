export type Joke =
  | { type: 'single'; joke: string }
  | { type: 'twopart'; setup: string; delivery: string }

export const JOKE_URL = 'https://v2.jokeapi.dev/joke/Programming,Miscellaneous,Pun?lang=en&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit'

export class JokeError extends Error {}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export async function fetchJoke(signal: AbortSignal): Promise<Joke> {
  const response = await fetch(JOKE_URL, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new JokeError(response.status === 429
      ? 'アクセスが集中しています。少し待ってから、もう一度お試しください。'
      : '提供元で問題が発生しています。時間をおいて、もう一度お試しください。')
  }
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new JokeError('ジョークを読み取れませんでした。もう一度お試しください。')
  }
  if (typeof data === 'object' && data !== null) {
    const item = data as Record<string, unknown>
    const flags = item.flags
    const flagNames = ['nsfw', 'religious', 'political', 'racist', 'sexist', 'explicit']
    if (
      item.error === false && item.lang === 'en' && item.safe === true &&
      typeof flags === 'object' && flags !== null &&
      flagNames.every(name => (flags as Record<string, unknown>)[name] === false)
    ) {
      if (item.type === 'single' && isText(item.joke)) return { type: 'single', joke: item.joke }
      if (item.type === 'twopart' && isText(item.setup) && isText(item.delivery)) {
        return { type: 'twopart', setup: item.setup, delivery: item.delivery }
      }
    }
  }
  throw new JokeError('表示できるジョークが届きませんでした。もう一度お試しください。')
}
