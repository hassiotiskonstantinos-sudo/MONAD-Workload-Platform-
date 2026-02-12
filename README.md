# MONAD Workload Platform

A web-based manager app for law firms to monitor team workload, manage tasks, and run lightweight project portfolio management (PPM). Built with Google Workspace integration — syncs seamlessly with Google Calendar and Google Drive.

## Key Principles

- **Manager-centric**: Only the manager sees the full dashboard, historical logs, and financial data
- **Team members use Calendar**: Tasks and deadlines appear automatically in Google Calendar
- **Minimal Log page**: Team members access only a simple "My Log" page showing present and future items
- **Ultra-simple UX**: Designed for non-technical lawyers — big labels, clean cards, no clutter

## Features

### Manager Dashboard
1. **Team Today** — Card per person showing calendar blocks, tasks due today, current focus, quick actions
2. **My Tasks Today** — Manager's own tasks with one-click status updates
3. **Pending Deliverables** — Consolidated list with filters (this week / overdue / next 30 days)

### Core Modules
- **Tasks** — Create, assign, track with status (Not Started, In Progress, Blocked, Done)
- **Projects** — Portfolio view with tabs: Overview, Tasks, Milestones, Deliverables, Drive, Financial
- **Deliverables & Milestones** — Track deliverables with due dates, owners, and Drive links
- **Financial** — Manager-only budget/invoiced/collected/costs tracking per project

### Google Integration
- **Calendar Sync** — Tasks, deliverables, and workload items auto-create calendar events
- **Drive Integration** — Link projects to Drive folders, deliverables to files
- **Privacy Controls** — Per-user toggle for event title visibility (free/busy fallback)

### Team Member Log
- Shows only present and future items (no past history access)
- Update task status, add workload items
- Calendar events for the day

### People Logs (Manager-Only)
- Full historical timeline per team member
- Filter by date range, entity type
- Audit trail of all changes

## Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js with Google OAuth 2.0
- **Google APIs**: Calendar API, Drive API
- **UI**: Lucide icons, react-hot-toast, clsx

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Google Cloud project with OAuth credentials

### 1. Clone and Install

```bash
git clone <repo-url>
cd MONAD-Workload-Platform-
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — From Google Cloud Console
- `ADMIN_EMAILS` — Comma-separated manager emails
- `ALLOWED_DOMAIN` — Restrict to your Google Workspace domain

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Google Calendar API
   - Google Drive API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy the Client ID and Client Secret to your `.env`
6. Configure the **OAuth consent screen**:
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.readonly`

### 4. Database Setup

**Option A: Docker (recommended)**
```bash
docker-compose up db -d
```

**Option B: Local PostgreSQL**
```bash
createdb monad_workload
```

Then run migrations and seed:
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Docker Compose (Full Stack)

```bash
docker-compose up --build
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script (creates manager)
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth
│   │   │   ├── tasks/         # Tasks CRUD
│   │   │   ├── projects/      # Projects CRUD
│   │   │   ├── deliverables/  # Deliverables CRUD
│   │   │   ├── milestones/    # Milestones CRUD
│   │   │   ├── financial/     # Financial data
│   │   │   ├── workload/      # Workload items
│   │   │   ├── calendar/      # Calendar sync
│   │   │   ├── drive/         # Drive integration
│   │   │   ├── users/         # User management
│   │   │   ├── audit/         # Audit logs
│   │   │   └── search/        # Global search
│   │   ├── dashboard/         # Manager home page
│   │   ├── tasks/             # Tasks list page
│   │   ├── projects/          # Projects list + detail
│   │   ├── deliverables/      # Deliverables page
│   │   ├── financial/         # Financial overview
│   │   ├── log/               # Team member log page
│   │   ├── people-logs/       # Manager: historical logs
│   │   └── settings/          # Team settings
│   ├── components/
│   │   ├── layout/            # Sidebar, AppLayout, Providers
│   │   ├── dashboard/         # Dashboard section components
│   │   └── common/            # StatusBadge, Modal, SearchBar, EmptyState
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── api-utils.ts       # API helpers (auth checks, responses)
│   │   ├── audit.ts           # Audit logging
│   │   ├── google-calendar.ts # Calendar API wrapper
│   │   └── google-drive.ts    # Drive API wrapper
│   └── types/
│       └── next-auth.d.ts     # Session type augmentation
├── __tests__/
│   ├── rbac.test.ts           # RBAC and access control tests
│   └── calendar-sync.test.ts  # Calendar sync logic tests
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## Access Control Matrix

| Feature | Manager | Team Member |
|---------|---------|-------------|
| Dashboard | Full access | No access |
| All team tasks | View + edit | No access |
| Own tasks | View + edit | View + update status |
| Projects | Full CRUD | No access |
| Deliverables | Full CRUD | No access |
| Financial data | Full access | No access |
| People logs (history) | Full access | No access |
| Log page | N/A | Present + future only |
| Settings | Full access | No access |
| Calendar events | Read all team | Own calendar only |
| Create workload items | For anyone | Self only (if enabled) |

## Calendar Sync Rules

1. When a task/deliverable/workload item with a date is created → calendar event created
2. When a due date changes → calendar event updated
3. When a task is marked DONE → event title gets `[DONE]` prefix
4. App is the source of truth; manual calendar edits are not imported back (MVP)
5. If calendar access is revoked → "Calendar not connected" shown, tasks still work

## Running Tests

```bash
npm test
```

## License

Private — For internal use only.
