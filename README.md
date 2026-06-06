# ChurchTools MCP

MCP server for the [ChurchTools](https://church.tools) REST API. It exposes dedicated tools for
common ChurchTools reads and updates, plus OpenAPI-backed generic search/execute tools that reach the
long tail of the API (800+ endpoints) — so an MCP client like Claude can use the **whole** API.

Two ways to run it:

- **stdio (local / `npx`)** — single-user, runs as a child process of your MCP client (Claude Desktop,
  Claude Code, etc.). Easiest setup. **Start here.**
- **Streamable HTTP** — long-running service for multi-user / remote deployments.

> This is a fork of [samuelspagl/ct-mcp](https://github.com/samuelspagl/ct-mcp) that adds the stdio
> entrypoint and `npx` packaging. See [LICENSE](LICENSE).

## Use with Claude (stdio / npx)

You don't need to clone this repo or install anything by hand — `npx` downloads the package on first
start. You just edit one config file.

### Requirements

- **[Node.js](https://nodejs.org) (LTS)** installed. This provides `npx`, which Claude uses to launch
  the server. This is the only real prerequisite — without Node there is no `npx`.
- A **ChurchTools instance** and a **login token** (see *Getting your login token* below).
- An **MCP client** — usually the **Claude Desktop app** (which also powers Cowork).

### Installation (3 steps)

**1. Add the server to your client config.** For Claude Desktop, edit
`claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`; Windows:
`%APPDATA%\Claude\`). Add an `mcpServers` entry:

```json
{
  "mcpServers": {
    "churchtools": {
      "command": "npx",
      "args": ["-y", "churchtools-mcp"],
      "env": {
        "CHURCHTOOLS_BASE_URL": "https://your-domain.church.tools",
        "CHURCHTOOLS_PAT": "your-churchtools-login-token"
      }
    }
  }
}
```

**2. Fully restart Claude** (quit completely — ⌘Q on macOS — and reopen). MCP servers are only read at
startup.

**3. Test it** in a new chat: *“Who am I in ChurchTools?”* — this calls `ct_whoami` and should return
your person record.

For **Claude Code** (CLI) instead:

```bash
claude mcp add churchtools \
  --env CHURCHTOOLS_BASE_URL=https://your-domain.church.tools \
  --env CHURCHTOOLS_PAT=your-churchtools-login-token \
  -- npx -y churchtools-mcp
```

In stdio mode the server is single-user: it always uses `CHURCHTOOLS_PAT` and there is no inbound MCP
auth layer, so `MCP_SERVER_TOKEN` / `pat-forwarding` do not apply. Only `CHURCHTOOLS_BASE_URL` and
`CHURCHTOOLS_PAT` are required.

### Getting your ChurchTools login token

The token authenticates as a specific ChurchTools user — the server can do everything that user can do.

**Via the ChurchTools web UI (recommended):**

1. Log in to your ChurchTools instance in a browser.
2. Click your name / avatar in the top-right corner → **My profile** (Mein Profil).
3. Open the **Security** tab (Sicherheit).
4. Scroll to the **Login token** section — copy the existing token, or click **Generate** to create one.

**Via the API (advanced):**

While logged in, call:
```
GET https://<your-domain>.church.tools/api/persons/{personId}/logintoken
```
Your `personId` is shown in the URL when you open your profile, or returned by `GET /api/whoami`.
The endpoint creates a token on the fly if none exists yet.

---

Treat the token like a password. Anyone with it has your ChurchTools permissions.

### Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `churchtools` doesn't appear after restart | Config not fully reloaded — **quit Claude completely** (⌘Q), not just the window, then reopen. Check the JSON is valid (no trailing commas). |
| Server fails to start / `npx` not found | Node.js not installed, **or** the GUI app didn't inherit your shell `PATH`. Use the absolute path to npx, e.g. `"command": "/usr/local/bin/npx"` (find yours with `which npx`). |
| `ct_whoami` / API calls fail | Wrong or expired `CHURCHTOOLS_PAT`, or wrong `CHURCHTOOLS_BASE_URL`. The base URL is your instance root (e.g. `https://your-domain.church.tools`), **without** `/api`. |
| Slow first response | First run downloads the package via `npx`; subsequent starts are fast. |
| Want to update | `npx -y churchtools-mcp` always fetches the latest published version on start; just restart Claude. |

### ⚠️ This server can write and delete data

Read **and** write operations are available. The generic `ct_execute_write_action` tool plus the
dedicated `ct_update_*` tools can change or delete real ChurchTools data (people, events, songs, …),
limited only by the permissions of the token's user. Write tools ask for confirmation via MCP
elicitation when the client supports it; otherwise they return `confirmation_required` and must be
retried with `confirm=true`. Use a token with appropriately scoped permissions.

## Tools

Dedicated `ct_*` tools cover current-user context, people, groups, events, calendars, resources,
bookings, absences, service requests, songs, wiki search/read, and masterdata.

Event tools use explicit scope:

- `ct_list_events` and `ct_get_event_briefing` are general visible-event tools and do not imply that a
  person is involved.
- `ct_list_my_involved_events`, `ct_list_person_involved_events`, and
  `ct_get_my_involved_event_briefing` use `/persons/{personId}/events` (ChurchTools marks the person
  as involved).
- `ct_list_my_service_requests` is the primary tool for concrete assigned tasks/service requests.

Dedicated write tools: `ct_update_song`, `ct_update_event`, `ct_update_wiki_category`.

Generic OpenAPI tools (cover the rest of the API): `ct_search_actions`, `ct_execute_read_action`,
`ct_execute_write_action`. Use `ct_search_actions` first to discover the right endpoint, then execute.

## Configuration

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `CHURCHTOOLS_BASE_URL` | yes | – | e.g. `https://your-domain.church.tools` |
| `CHURCHTOOLS_PAT` | yes (stdio / `pat` mode) | – | ChurchTools login token; sent as `Authorization: Login <token>` |
| `CHURCHTOOLS_OPENAPI_URL` | no | `${BASE_URL}/system/runtime/swagger/openapi.json` | OpenAPI spec location |
| `REQUEST_TIMEOUT_MS` | no | `30000` | Upstream request timeout |
| `MAX_RESPONSE_BYTES` | no | `100000` | Truncates large responses |

HTTP-only variables (`PORT`, `HOST`, `CHURCHTOOLS_AUTH_MODE`, `MCP_SERVER_TOKEN`,
`ALLOW_UNAUTHENTICATED_MCP`, `LOG_LEVEL`) are described under **HTTP server** below; they are ignored
in stdio mode.

## Local development

```bash
npm install
npm run build      # compiles dist/index.js (HTTP) and dist/stdio.js (stdio)
npm run dev:stdio  # watch-run the stdio entrypoint
npm test           # vitest
```

For local stdio runs you can also put the variables in a `.env` file in the project root; the server
loads it on startup.

### Inspect with the MCP Inspector

```bash
CHURCHTOOLS_BASE_URL=https://your-domain.church.tools \
CHURCHTOOLS_PAT=your-churchtools-login-token \
npx @modelcontextprotocol/inspector node dist/stdio.js
```

Then call `tools/list`, run `ct_whoami`, and try `ct_search_actions`.

## HTTP server

For multi-user / remote deployments, run the Streamable HTTP entrypoint instead.

```bash
cp .env.example .env   # set CHURCHTOOLS_BASE_URL, CHURCHTOOLS_AUTH_MODE, MCP_SERVER_TOKEN, ...
npm run build && npm start
```

HTTP-specific config:

- `CHURCHTOOLS_AUTH_MODE`: `pat` (one shared token) or `pat-forwarding` (per-request user token via the
  `X-ChurchTools-PAT` header).
- `MCP_SERVER_TOKEN`: bearer token required by callers of `POST /mcp` (unless
  `ALLOW_UNAUTHENTICATED_MCP=true`).
- `PORT`, `HOST`, `LOG_LEVEL`.

Endpoints: `POST /mcp` (MCP Streamable HTTP), `GET /health` (liveness), `GET /ready` (catalog loaded).

In `pat-forwarding` mode every request must send both headers:

```http
Authorization: Bearer <mcp-server-token>
X-ChurchTools-PAT: <user-churchtools-pat>
```

The server does not store forwarded PATs. OAuth is intentionally deferred: ChurchTools OAuth tokens do
not authenticate REST calls, so a proper MCP OAuth flow would need separate work.

### Docker

```bash
docker build -t churchtools-mcp .
docker run --rm -p 3000:3000 --env-file .env churchtools-mcp
```

## Credits

Fork of [samuelspagl/ct-mcp](https://github.com/samuelspagl/ct-mcp) (MIT). The original project provides
the HTTP server, the dedicated/generic tool design, and the ChurchTools API client wiring; this fork
adds the stdio entrypoint and `npx` distribution.
