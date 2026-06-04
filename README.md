# CrossAttention — AI-Powered Support Ticket System

A full-stack customer support platform built with Next.js 16, Supabase, and Groq LLM inference. Designed for teams that need structured ticket management with automated triage, real-time chat, and role-based access control.

---

## What it does

CrossAttention replaces manual ticket routing with an AI layer that reads each ticket, assigns a priority level, analyzes client sentiment, and drafts a first response — all before any agent opens it. Agents can take tickets, escalate them, chat with the reporter in real time, and request additional AI assistance at any point during the resolution flow. Managers get a read-only command center with live metrics. Admins control user roles from a dedicated panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Database & Auth | Supabase (PostgreSQL + GoTrue) |
| SSR Auth | `@supabase/ssr` with `createServerClient` |
| AI Inference | Groq API — `llama-3.3-70b-versatile` |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 |
| Runtime | Node.js |

---

## Architecture

The application is structured around four user roles with strictly separated views:

```
User     → /dashboard           — views own tickets, creates new ones
Agent    → /dashboard           — views all tickets, takes/escalates them
Manager  → /dashboard/manager   — read-only metrics and high-priority queue
Admin    → /dashboard/admin/users — role management panel
```

The main `/dashboard` route is a Server Component that calls `supabase.auth.getUser()` (JWT-validated against Supabase Auth on every request) and fetches data conditionally based on the resolved role before passing it down to the client shell. This avoids client-side role-fetching waterfalls and prevents unauthorized data exposure.

---

## AI Features

Three independent API routes handle AI functionality, each calling Groq with a structured JSON output schema and a schema-validation layer that catches malformed responses before they reach the database.

### Ticket Analysis — `POST /api/analyze-ticket`

Called automatically when a new ticket is submitted via `/reportar`. Returns:

```json
{
  "summary": "Short problem summary",
  "classification": {
    "priority": "baja | media | alta",
    "sentiment": "positivo | neutral | negativo"
  },
  "suggestions": {
    "response": "Drafted client response",
    "nextAction": "asignar | escalar | cerrar | pedir más datos"
  },
  "riskLevel": "bajo | medio | alto"
}
```

Results are stored directly in the ticket row (`ai_summary`, `ai_suggested_response`, `ai_next_action`, `risk_level`, `ai_latency`, `ai_model`, `ai_raw_result`) for full observability.

### AI Assisted Response — `POST /api/suggest-response`

Available to agents only inside the ticket detail view. Receives the ticket title, description, and pre-analyzed sentiment and returns a polished, client-facing response draft ready to send or edit.

### AI Ticket Summary — `POST /api/summarize-ticket`

Also agent-exclusive. Produces a two-field condensed summary designed for quick situational awareness:

```json
{
  "mainProblem": "...",
  "recommendedAction": "..."
}
```

All three endpoints include a graceful fallback: if Groq is unavailable or returns invalid JSON, a pre-defined default value is returned with a `_warning` field rather than surfacing an error to the user.

---

## Role-Based Access Control

Roles are stored in a `profiles` table in Supabase, linked 1:1 to `auth.users`. The server reads the role on every dashboard render — there is no client-side role caching that could be spoofed.

| Role | Capabilities |
|---|---|
| `user` | Create tickets, view own tickets, real-time chat on own tickets |
| `agent` | View all tickets, take unassigned tickets, escalate own tickets, AI response tools, real-time chat |
| `manager` | Read-only metrics dashboard, high-priority ticket overview |
| `admin` | Assign and change roles for any non-user account via admin panel |

The AI response and summary buttons are rendered conditionally based on the role resolved server-side, so they are never present in the DOM for non-agent sessions.

---

## Notification System

Ticket state changes (taken, escalated) automatically insert rows into a `notifications` table for the ticket's owner. The `NotificationBell` component subscribes to this table via Supabase Realtime and shows an unread count badge. Notifications are marked as read when the panel is opened.

---

## Real-Time Chat

The ticket detail page opens a real-time chat thread between the reporter and the assigned agent. Messages are stored in Supabase and streamed live using Supabase Realtime channels, scoped per ticket ID.

---

## Project Structure

```
app/
  api/
    analyze-ticket/     — AI triage on ticket creation
    suggest-response/   — AI draft response for agents
    summarize-ticket/   — AI quick summary for agents
  components/
    HeroCTA.tsx
    Loader.tsx
    LogoutButton.tsx
    Navbar.tsx
    NotificationBell.tsx
    TicketActionButtons.tsx  — Take / Escalate logic
  dashboard/
    DashboardShell.tsx       — Role-branching presentation shell
    admin/users/             — Admin role management panel
    manager/                 — Manager metrics + high-priority queue
    ticket/[id]/             — Ticket detail, chat, AI tools
  features/
    dashboard/               — ManagerMetrics, ManagerCommandCenter
    tickets/                 — TicketList, TicketActions, TicketComments
  login/
  registro/
  reportar/                  — New ticket form (with AI triage on submit)
utils/
  supabase.ts                — Browser client (singleton, lazy-initialized)
  supabase-server.ts         — Server client factory
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project with the tables described below
- A Groq API key (free tier is sufficient for development)

### 1. Clone and install

```bash
git clone https://github.com/AveRyCarNey/crossatention.git
cd crossatention
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=your-groq-api-key
```

### 3. Set up Supabase

The application expects the following tables:

**`profiles`** — One row per user, linked to `auth.users`
```sql
id          uuid references auth.users primary key
email       text
role        text default 'user'  -- 'user' | 'agent' | 'manager' | 'admin'
```

**`tickets`**
```sql
id                   uuid primary key default gen_random_uuid()
user_id              uuid references auth.users
assigned_to          uuid references profiles(id)
title                text
description          text
status               text default 'abierto'
priority             text
sentiment            text
sender               text
created_at           timestamptz default now()
ai_summary           text
ai_suggested_response text
ai_next_action       text
ai_model             text
ai_latency           int
ai_prompt            text
ai_raw_result        text
risk_level           text
```

**`notifications`**
```sql
id          uuid primary key default gen_random_uuid()
user_id     uuid references auth.users
ticket_id   uuid references tickets(id)
title       text
message     text
is_read     boolean default false
created_at  timestamptz default now()
```

**`messages`** (for real-time chat)
```sql
id          uuid primary key default gen_random_uuid()
ticket_id   uuid references tickets(id)
user_id     uuid references auth.users
content     text
created_at  timestamptz default now()
```

Enable Row Level Security on all tables and configure policies so users can only read their own data, agents can read all tickets, and service operations are allowed via the anon key where appropriate.

### 4. Run locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Key Design Decisions

**`getUser()` over `getSession()` in Server Components.** `getSession()` reads the JWT locally from the cookie without revalidating against Supabase Auth. If the session has expired or been revoked, `getSession()` returns a stale truthy result. `getUser()` makes a network call to verify the token on every server render, which is the only safe approach for SSR.

**Singleton Supabase browser client.** The browser client in `utils/supabase.ts` is initialized once and reused across all client components to avoid the "Multiple GoTrueClient instances" warning and the session sync bugs that come with it.

**AI calls are fire-and-validate.** Each API route validates the model's JSON against a strict TypeScript interface before returning it to the caller. If the model hallucinates a field or returns an unexpected value, the validation layer throws and the fallback kicks in. The raw model output is also saved in `ai_raw_result` for debugging.

**No client-side role fetching.** The dashboard role resolution happens entirely in the Server Component. Client components receive the role as a prop. This means the UI hierarchy is always consistent with what the server authorized, without a loading flash or a second network round-trip.

---

## Design System

The interface uses a Neo-Brutalist aesthetic: heavy black borders, offset box shadows, bold uppercase typography (Space Grotesk), and a high-contrast color palette built on yellow (`#FFEA6C`), fuchsia (`#FF61F8`), and navy (`#0F172A`). Hover states use translate transforms rather than color changes to preserve the tactile feel of the design.

---

## Author

Built by **WuLliBer Yepez** as part of the VeneSoft curriculum — Proyecto 1: CrossAttention.
