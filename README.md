# ひと笑い

A focused random joke generator built with React, TypeScript, and Vite. Japanese interface; English jokes in their original language. This replaces the earlier calendar concept. No accounts, persistence, API keys, translation service, or backend are needed.

## Local development

Use Node.js 22.12+ (Node.js 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```sh
npm test          # Vitest + React Testing Library, mocked fetch; no network needed
npm run lint     # Oxlint
npm run build    # TypeScript checks and production assets in dist/
npm run preview  # Preview the production build locally
```

`dist/` can be served by a static web host. Relative asset paths support GitHub Pages project URLs as well as root hosting.

## スマホで見る・GitHub Pagesへの公開

公開後は、スマホのSafari・Chromeで次のURLを開くだけで利用できます。

**公開予定URL：https://otoufutarou.github.io/magazine-ai-calendar/**

このURLは公開先の予定であり、設定追加だけでは公開済みになりません。初回はリポジトリ所有者が以下の操作を行ってください。

1. [Settings → Pages](https://github.com/otoufutarou/magazine-ai-calendar/settings/pages)を開き、「Build and deployment」の「Source」を **GitHub Actions** に設定します。
2. 実装と公開設定を含むPRを `main` にマージします。
3. [Actions](https://github.com/otoufutarou/magazine-ai-calendar/actions)の **Publish to GitHub Pages** が成功するのを確認します。公開先はジョブの `github-pages` 環境リンクにも表示されます。
4. スマホで上の公開URLを開きます。アプリのインストールは不要ですが、ジョーク取得にはインターネット接続が必要です。

すでにマージ済みの場合は、Pages有効化後にActionsの **Publish to GitHub Pages → Run workflow → main** で再実行できます。初回公開前や配信失敗時には、予定URLが404になることがあります。

**非公開リポジトリの注意：** 現在このリポジトリは非公開です。非公開リポジトリでのPages利用には対応するGitHubの契約プランが必要です。Pages設定にアップグレードの案内が出る場合、この方法では現在の契約のまま公開できません。無断でリポジトリを公開に変更したり、有料プランを契約したりすることはありません。また、非公開リポジトリから配信してもPagesサイト自体は通常インターネットに公開されます。機密情報は含めないでください。

ワークフローはPRでテスト・lint・ビルドを行い、`main` のみを配信します。追加のAPIキーや手動登録するデプロイ用シークレットは不要です。リポジトリ設定の変更とPRのマージはこの実装には含まれず、配信成功までは公開済みとは扱いません。

## External API

[JokeAPI v2 documentation](https://v2.jokeapi.dev/), a public API requiring no credentials:

```text
GET https://v2.jokeapi.dev/joke/Programming,Miscellaneous,Pun?lang=en&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit
```

- Both documented formats are supported: `type: "single"` with `joke`, and `type: "twopart"` with `setup` and `delivery`. Two-part jokes have a keyboard-accessible reveal/hide button.
- Success responses are checked for `error: false`, `lang: "en"`, `safe: true`, all six flags set to `false`, and nonblank strings. Unusable responses have a Japanese error and retry action.
- API text is rendered as React text, never HTML. The UI identifies English and JokeAPI as the source; it does not claim to translate jokes.
- Only Programming, Miscellaneous, and Pun categories are requested. Safe mode and all blacklist flags are enabled. These are best-effort, human-curated filters, **not a guarantee** that every joke is appropriate or inoffensive.
- The browser calls the API directly. Documented CORS support uses `Access-Control-Allow-Origin: *`; no proxy is required.
- Requests have a 10-second timeout, are cancelled on unmount, and concurrent button requests are blocked. Network, invalid JSON, empty/malformed data, HTTP errors, and rate limiting have retry states. Random results can repeat.
- Internet access is required. DNS failures, browser/network restrictions, service downtime, changed API behavior, or rate limits can prevent fetching. No offline/sample-joke fallback is presented as a real API result. The documented limit is 120 requests per minute per IP; HTTP 429 asks the user to wait before retrying.

### Verification sources and limitations

API schema, filters, and CORS were verified against the provider's [official source snapshot](https://github.com/Sv443/JokeAPI/tree/21e7e409b550fe81d3efde0f57fa0a91bb50eea8):

- [Endpoint and supported parameters](https://github.com/Sv443/JokeAPI/blob/21e7e409b550fe81d3efde0f57fa0a91bb50eea8/endpoints/joke.js#L15-L30)
- [Response types](https://github.com/Sv443/JokeAPI/blob/21e7e409b550fe81d3efde0f57fa0a91bb50eea8/src/types/jokes.d.ts)
- [CORS headers](https://github.com/Sv443/JokeAPI/blob/21e7e409b550fe81d3efde0f57fa0a91bb50eea8/src/httpServer.js#L94-L103)
- [Documentation, including safe-mode caveats](https://github.com/Sv443/JokeAPI/blob/21e7e409b550fe81d3efde0f57fa0a91bb50eea8/docs/raw/index.html)
- [Rate limit configuration](https://github.com/Sv443/JokeAPI/blob/21e7e409b550fe81d3efde0f57fa0a91bb50eea8/settings.js#L148-L152)

The provider's GitHub README now points to a new source host. Although the CLI environment could not resolve the API domain, manual verification from the local app in a browser **successfully fetched a real HTTP 200 CORS response**, with English two-part joke text, `safe: true`, and all six flags `false`. This confirms browser access at verification time, not ongoing service availability; current rate limits were not independently measured. Automated tests use mocked responses matching the documented schema, not live API calls.
