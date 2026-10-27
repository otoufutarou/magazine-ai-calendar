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

`dist/` can be served by a static web host; no deployment is included.

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
