# Chatbot / Widget module

Public HTTP + WebSocket surface consumed by the embeddable web widget
(`frontend/widget/`). This module resolves which `Channel` (a
`business_channels` row of type `web_chat`) should handle an incoming
request, so a single business can run N web widgets — each with its own
theme, allowed domains and assigned agent — instead of exactly one.

## Channel resolution

Every public endpoint accepts an optional `channel_id` alongside the
still-required `business_id`. Resolution order:

1. **`channel_id` present** → resolved directly via
   `ChannelsService.findByChannelId`. Must be an `ACTIVE` `web_chat` channel,
   otherwise the request fails with `404`.
2. **`channel_id` absent, `business_id` present** (pre-migration embeds) →
   the business's active `web_chat` channels are fetched
   (`ChannelsService.findAllByBusiness`) and the first one is used. If more
   than one active web channel exists, a warning is logged asking that embed
   to be updated with an explicit `channel_id` — the request still succeeds.
3. **Business has zero `Channel` rows at all** (never migrated off the old
   model) → falls back to the legacy `ChatbotConfig`-based flow, unchanged.
4. Anything else that doesn't resolve to a valid channel → `404`.

`business_id` is not removed from any contract: it stays required for
traceability/analytics and as the fallback key in step 2. Tenant identity for
all writes (conversation, messages, agent queue payload) is taken from the
**resolved channel's own `business_id`**, not the caller-supplied one — if
they disagree (e.g. a stale `channel_id`), a warning is logged and the
channel's value wins.

## Domain allowlisting

If the resolved channel's `config.allowedDomains` is a non-empty array, the
request's `Origin` header (falling back to `Referer`) must match one of
those domains (exact match or subdomain) or the endpoint responds `403`. An
unset/empty `allowedDomains` means no restriction (matches
`WebChatChannelProvider.validateConfig`, which treats it as optional). See
`src/modules/channels/utils/origin.util.ts`.

## Rate limiting

Sending a chat message is rate-limited via `ChatRateLimitGuard`
(`src/modules/chatbot/guards/chat-rate-limit.guard.ts`), whose core check
(`consume(channelId, visitorFingerprint)`) is called both from the guard (for
any remaining HTTP routes) and directly from `ChatGateway`'s
`conversation:send-message` socket handler: a fixed Redis window keyed by
`channelId:visitorFingerprint`. Defaults: 20 requests / 60s, configurable via
`CHAT_RATE_LIMIT_MAX` and `CHAT_RATE_LIMIT_WINDOW_SEC`. Exceeding it returns
`{ ok: false, error: 'rate_limited' }` in the socket ack.

## WebSocket gateway (`/chat` namespace)

Visitor sockets now join a `channel:{channelId}` room in addition to
`business:{businessId}` when `auth.channelId` is provided on connect. This
prepares message routing to be scoped per channel so two web widgets of the
same business don't cross conversations — events are not yet routed through
it (`emitNewMessage` etc. still target `business:{id}` /
`conversation:{id}`), only the room membership exists so far.

## Contract: before → after

### `GET /chat/public-config`

| | Before | After |
|---|---|---|
| Query params | `business_id` | `business_id` (required), `channel_id` (optional) |
| Response (channel-backed business) | n/a — always read `ChatbotConfig` | `{ channel_id, business_id, name, theme, position, primaryColor, greeting, is_active }` from the resolved `Channel.config` |
| Response (legacy business) | `ChatbotConfig` fields (`name`, `welcome_message`, `tone`, `locale`, `theme`, `is_active`) | unchanged |
| Domain check | none | `403` if `Origin`/`Referer` isn't in the resolved channel's `allowedDomains` |

### `POST /chat/chat` — removed

The REST route was removed. After the widget exchanges its `public_key` for
a session via `GET /chat/public-config` (still REST, since it's what
authenticates the socket), sending a message happens over the `/chat`
Socket.IO namespace instead: `conversation:send-message` →
`ChatGateway.handleSendMessage` → `ChatService.processChat` (unchanged). The
handler rebuilds the `WidgetSessionPayload` from the visitor socket's
`client.data` (populated at `handleConnection` from the same signed session
token the old `WidgetSessionGuard` verified), so `processChat` itself needed
no changes — only its caller moved from an HTTP controller to the gateway.
The ack returns `{ ok: false, error }` on failure instead of throwing an HTTP
status.

Lead capture (`POST /chat/lead-capture`, `ChatService.captureLead`) was
removed entirely, not ported to a socket event — the widget no longer
collects contact info from the chat.

### WebSocket `auth` payload (visitor/widget flow)

| | Before | After |
|---|---|---|
| `auth` | `{ businessId, conversationId? }` | `{ businessId, channelId?, conversationId? }` |
| Rooms joined | `business:{businessId}` (+ `conversation:{id}` once identified) | same, plus `channel:{channelId}` when `channelId` is provided |

## Embed snippet

There used to be two duplicate, business-only `GET /chat/embed-snippet`
endpoints (`chat.controller.ts` and the now-removed `embed.controller.ts`) —
both registered the exact same route, and neither could express "which of
this business's N web channels" the snippet was for. Both were removed.

The snippet is now generated per channel: `GET
/channels/:channelId/embed-snippet` (`ChannelsController` /
`ChannelsService.getEmbedSnippet`). `businessId` comes from the JWT, not the
URL, so the snippet is only returned if the channel belongs to the caller's
business.
Output: `<script src="..." data-channel-id="{channelId}"
data-business-id="{businessId}" defer></script>` — `data-business-id` is kept
for debug/analytics only, the widget must look the channel up by
`data-channel-id`.

## Not yet migrated

Controllers/endpoints out of scope for this change (left on `business_id`
only, to be revisited separately): the admin inbox endpoints (`GET
/chat/conversations`, `GET /chat/conversations/:id`, `PATCH
/chat/conversations/:id/status`), which are authenticated and already scoped
by the caller's own `business_id`.
