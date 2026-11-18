# Application architecture

This doc describes the main layers of the WFC app and how requests flow: client → Next.js (pages or tRPC API) → tRPC context and routers → services → database. External services are used for auth, email, realtime, SMS, payments, and observability.

**Request flow:** Client (React + TanStack Query) → Next.js `/api/trpc` → tRPC (context from Clerk → middlewares → routers) → services → Drizzle → Supabase; external services are used from the app or from the services layer.

```mermaid
flowchart TB
  subgraph client [Client]
    Browser[Browser]
    React[React App]
    TQ[TanStack Query]
    Browser --> React
    React --> TQ
  end

  subgraph nextjs [Next.js - Heroku]
    AppRouter[App Router pages]
    API["/api/trpc"]
    AppRouter --> API
  end

  subgraph trpc [tRPC layer]
    Ctx["Context: Clerk auth, db, userId, userRole"]
    Middle["Middlewares: timing, Sentry, userRoleMiddleware"]
    Routers["Routers: Zod, thin"]
    Ctx --> Middle --> Routers
  end

  subgraph services [Services]
    Domain["Domain logic - src/server/services"]
  end

  subgraph data [Data]
    Drizzle[Drizzle ORM]
    Supabase[("Supabase Postgres + RLS")]
    Drizzle --> Supabase
  end

  subgraph external [External services]
    ExtSvcs["Auth, email, realtime, SMS, payments, observability"]
    Clerk[Clerk]
    SendGrid[SendGrid]
    Ably[Ably]
    Twilio[Twilio]
    Stripe[Stripe]
    Sentry[Sentry]
    PostHog[PostHog]
  end

  client --> AppRouter
  client --> API
  API --> Ctx
  Routers --> Domain
  Domain --> Drizzle
  Domain --> ExtSvcs
  Ctx --> Clerk
  Middle --> Sentry
  React --> PostHog
```

## Request flow (sequence)

One API request from the client through to the database:

```mermaid
sequenceDiagram
  participant Client
  participant NextJS
  participant Clerk
  participant trpc
  participant Services
  participant Drizzle
  participant Supabase

  Client->>NextJS: GET/POST /api/trpc
  NextJS->>Clerk: auth()
  Clerk-->>NextJS: user/session claims
  NextJS->>trpc: createContext + request
  trpc->>trpc: middlewares (timing, Sentry, userRoleMiddleware)
  trpc->>Services: procedure call
  Services->>Drizzle: query
  Drizzle->>Supabase: SQL (RLS applied)
  Supabase-->>Drizzle: rows
  Drizzle-->>Services: data
  Services-->>trpc: result
  trpc-->>NextJS: response
  NextJS-->>Client: JSON
```

- **RLS:** `userRoleMiddleware` sets `request.jwt.claims` and `SET ROLE` per request so Supabase RLS policies can use role/claims.
- **External services** are invoked from services or from the app (e.g. Stripe webhooks, PostHog in layout). For how each major integration works in code, see [Third-party integrations](third-party-services/README.md). For account access and setup, see [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).
