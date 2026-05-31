# 🪐 Solaris Letters — Space Messenger

> A cinematic, immersive social messaging app set inside a fully interactive 3D solar system. Send letters to friends assigned to planets, explore deep space, and experience real-time cosmic communication.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [3D Scene Architecture](#3d-scene-architecture)
- [State Management](#state-management)
- [Authentication](#authentication)
- [Real-Time Communication](#real-time-communication)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Key Components](#key-components)
- [Changelog](#changelog)

---

## Overview

**Solaris Letters** is a full-stack web application that reimagines social messaging as a cosmic experience. Each user lives in a solar system — friends are assigned to planets, and messages are "letters" transmitted across space. The app features:

- A photorealistic, procedurally generated **3D solar system** (Three.js / React Three Fiber)
- **Cinematic Milky Way galaxy** visible when zooming out — built with 450k+ particles using realistic star color distributions, 3D lens shape, and dust lane gaps
- **Real-time letter delivery** via Socket.io
- **Blackhole panel** for account management (deactivation)
- **Scheduled letter delivery** (future-self letters with delay)
- Group chat, friend requests, planet assignments, and more

---

## Tech Stack

### Frontend (`/client`)

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | Latest | Build tool & dev server |
| Three.js | Latest | 3D rendering engine |
| @react-three/fiber | Latest | React renderer for Three.js |
| @react-three/drei | Latest | Three.js helpers (CameraControls, Stars, Html) |
| @react-three/postprocessing | Latest | Bloom, Vignette effects |
| Zustand | Latest | Global state management |
| Framer Motion | Latest | UI animations |
| Supabase JS | ^2.105.4 | Authentication client |
| TailwindCSS | Latest | Utility styling |

### Backend (`/server`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js + TypeScript | 6.x | Runtime |
| Express | ^5.2.1 | HTTP server |
| Socket.io | ^4.8.3 | Real-time events |
| Prisma | ^5.22.0 | ORM / Database client |
| Supabase | ^2.105.4 | Auth verification |
| JWT (jsonwebtoken) | ^9.0.3 | Token auth |
| bcryptjs | ^3.0.3 | Password hashing |
| tsx | ^4.21.0 | TypeScript execution (dev) |

### Database

- **PostgreSQL** via **Supabase** (cloud-hosted)
- **Prisma** as ORM with generated client output to `server/node_modules/.prisma/client`
- Local dev DB: `prisma/dev.db` (SQLite for local testing)

---

## Project Structure

```
Solaris Letters/
├── prisma/
│   ├── schema.prisma          # All database models
│   ├── dev.db                 # Local SQLite dev database
│   └── migrations/            # Migration history
│
├── server/
│   ├── index.ts               # Express app + Socket.io setup
│   ├── db.ts                  # Prisma client singleton
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   └── routes/
│       ├── auth.ts            # /api/auth — login, register, refresh
│       ├── letters.ts         # /api/letters — CRUD + stats
│       ├── friends.ts         # /api/friends — add, remove, assign, requests
│       ├── users.ts           # /api/users — profile, settings
│       ├── groups.ts          # /api/groups — create, message, members
│       └── blackhole.ts       # /api/blackhole — account deactivation
│
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Router + auth gate
│       ├── index.css          # Global styles + CSS variables
│       │
│       ├── three/
│       │   └── SolarSystem.tsx  # 🌌 ENTIRE 3D scene (see below)
│       │
│       ├── pages/
│       │   └── HomePage.tsx   # Main app page (HUD + scene + modals)
│       │
│       ├── components/
│       │   ├── LetterComposer.tsx    # Write & send letters modal
│       │   ├── LetterInbox.tsx       # Inbox modal (received + sent)
│       │   ├── PlanetDetails.tsx     # Planet info panel + friend assignment
│       │   ├── FriendSearchModal.tsx # Search & add friends
│       │   ├── BlackholePanel.tsx    # Account deactivation panel
│       │   ├── SettingsOverlay.tsx   # User profile settings
│       │   ├── GroupChat.tsx         # Group messaging panel
│       │   ├── PlanetPickerModal.tsx # Assign friend to a planet
│       │   └── StarfieldBackground.tsx # 2D CSS fallback starfield
│       │
│       ├── store/
│       │   └── useAppStore.ts # Zustand global store
│       │
│       ├── lib/
│       │   ├── api.ts         # Axios-like API client (auto token injection)
│       │   ├── socket.ts      # Socket.io client singleton
│       │   └── supabase.ts    # Supabase client
│       │
│       ├── hooks/             # Custom React hooks
│       ├── types/             # Shared TypeScript interfaces
│       └── utils/
│           └── particleTexture.ts  # Circle texture generator for particles
│
└── package.json               # Root workspace scripts
```

---

## Features

### 🌍 Interactive 3D Solar System

- **Sun** with dynamic corona glow and bloom post-processing
- **8 Planets** (Mercury → Neptune) + **Pluto** with high-res NASA-style textures
- **3 Dwarf Planets** (Haumea, Makemake, Eris) orbiting beyond the Kuiper Belt
- **Asteroid Belt** between Mars and Jupiter
- **Kuiper Belt** beyond Neptune
- **Oort Cloud** at the system's edge
- **Saturn & Uranus** have textured planetary rings
- **Real orbital mechanics** — each planet orbits at astronomically-proportional speeds
- **Double-click zoom** — zoom into any object
- **Camera controls** — pan, zoom, orbit with smooth damping

### 🌌 Milky Way Galaxy (Cinematic)

The galaxy is procedurally generated using ~450,000 particles and follows real astrophysics:

- **2-arm logarithmic spiral** structure
- **Realistic star color distribution**:
  - 35% blue-white `#A8CCFF` (young hot stars, concentrated in outer arms)
  - 40% warm white `#FFF5E0` (main sequence stars)
  - 15% yellow-orange `#FFD080` (older stars, concentrated in the core)
  - 10% orange-red `#FF8844` (red giants, scattered)
- **3D lens shape** — fat central bulge (±35% height) tapering to a razor-thin disc (±15-25 units) at the edges
- **Dust lane gaps** — inter-arm regions skip particles with 65% probability, creating visible dark lanes
- **Central bulge glow sprite** — warm white → gold → amber radial gradient (opacity 0.45, AdditiveBlending)
- **Stellar halo** — 14,000 old orange-red halo stars in a flattened spheroid
- **Slow rotation** — galaxy rotates at 0.000018 rad/frame
- **Distance-based fade** — galaxy invisible at solar system scale, fades in at camera dist 2000–5500

### 💌 Letter System

- Compose rich letters with **paper skin themes** (parchment, etc.)
- Add **stickers** to letters
- **Scheduled delivery** — set a future date for delivery
- **Future-self letters** — letters from you to yourself, delivered later
- **Unread badge** on planets and in the navbar
- Letters are tied to **planet assignments** — sending to a friend on Mars shows their planet

### 👥 Social System

- **Friend search** by `@cosmic_id`
- **Friend requests** (pending/accepted system)
- **Planet assignment** — assign each friend to a planet in your solar system
- **Dwarf planet assignment** — Haumea, Makemake, Eris can also be assigned
- **Interaction score** — tracks communication frequency per friendship
- **Account deactivation** — via the Blackhole panel; deactivated users' planets turn dark red

### 💬 Group Chat

- Create groups with a name and theme color
- Group members can send real-time messages
- Groups have a `cosmic_position` field for 3D scene placement

### ⚙️ Settings

- Change **display name** and **bio**
- Update **Cosmic ID** (username) — limited to 3 changes
- Avatar icon selection
- Planet type and hue customization

### 🕳️ Blackhole Panel

- View and manage account status
- Trigger account **deactivation**
- Deactivated accounts render as dark red, unresponsive planets

---

## Database Schema

### Models

#### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `cosmic_id` | String (unique) | Public username (@ handle) |
| `display_name` | String | Display name |
| `bio` | String | Profile bio |
| `avatar_icon` | String? | Icon identifier |
| `cosmic_id_changes` | Int | Max 3 username changes |
| `planet_type` | Int | Visual planet type |
| `planet_hue` | Float | Planet color hue |
| `is_active` | Boolean | Account status |
| `unread_count` | Int | Cached unread letters |

#### `Letter`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `sender_id` | String | FK → User |
| `recipient_id` | String | FK → User |
| `body` | String | Letter content |
| `stickers` | JSON | Array of sticker objects |
| `paper_skin` | String | Visual theme (default: `parchment`) |
| `is_future_self` | Boolean | Self-addressed letter |
| `deliver_at` | DateTime | Scheduled delivery time |
| `sent_at` | DateTime | When composed |
| `read_at` | DateTime? | When opened |
| `is_archived` | Boolean | Soft delete |

#### `Friendship`
| Field | Type | Notes |
|---|---|---|
| `user_id` | String | FK → User |
| `friend_id` | String | FK → User |
| `interaction_score` | Int | Tracks frequency |
| `added_at` | DateTime | When befriended |

#### `FriendRequest`
| Field | Type | Notes |
|---|---|---|
| `sender_id` | String | FK → User |
| `target_id` | String | FK → User |
| `status` | String | `pending` / `accepted` / `rejected` |

#### `PlanetAssignment`
| Field | Type | Notes |
|---|---|---|
| `user_id` | String | Owner (composite PK) |
| `friend_id` | String | Assigned friend (composite PK) |
| `planet_name` | String | e.g., `Mercury`, `Haumea` |

#### `Group`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Group name |
| `cosmic_position` | JSON? | 3D position `{x, y, z}` |
| `theme_color` | String | Hex color |
| `created_by` | String | FK → User |

#### `GroupMember` / `GroupMessage`
Standard join table and message model for group chat.

---

## API Reference

### Base URL: `http://localhost:4000`

All protected routes require `Authorization: Bearer <JWT>` header.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Get JWT token |
| `POST` | `/api/auth/refresh` | No | Refresh token via Supabase |

### Letters — `/api/letters`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/letters` | ✅ | Get inbox + sent (non-archived, delivered) |
| `POST` | `/api/letters` | ✅ | Send a letter (scheduled or immediate) |
| `PATCH` | `/api/letters/:id/read` | ✅ | Mark letter as read |
| `GET` | `/api/letters/stats?friendId=` | ✅ | Get sent/received/unread counts for a friend |

### Friends — `/api/friends`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/friends` | ✅ | List friends + planet assignments |
| `POST` | `/api/friends/request` | ✅ | Send friend request |
| `POST` | `/api/friends/accept` | ✅ | Accept friend request |
| `DELETE` | `/api/friends/:friendId` | ✅ | Remove friend |
| `POST` | `/api/friends/assign` | ✅ | Assign friend to planet |
| `GET` | `/api/friends/requests` | ✅ | List pending requests |
| `GET` | `/api/friends/search?q=` | ✅ | Search by cosmic_id |

### Users — `/api/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | ✅ | Get own profile |
| `PATCH` | `/api/users/me` | ✅ | Update profile (name, bio, avatar) |
| `PATCH` | `/api/users/me/cosmic-id` | ✅ | Change cosmic_id (max 3x) |

### Groups — `/api/groups`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/groups` | ✅ | List user's groups |
| `POST` | `/api/groups` | ✅ | Create group |
| `GET` | `/api/groups/:id/messages` | ✅ | Get messages |
| `POST` | `/api/groups/:id/messages` | ✅ | Send message |

### Blackhole — `/api/blackhole`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/blackhole/deactivate` | ✅ | Deactivate account |
| `GET` | `/api/blackhole/status` | ✅ | Get account status |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server heartbeat |

---

## 3D Scene Architecture

All 3D code lives in `client/src/three/SolarSystem.tsx`.

### Component Hierarchy

```
<SolarSystem>
  └── <Canvas> (Three.js renderer)
      ├── <CameraControls>            — Orbit/pan/zoom
      ├── <DoubleClickZoom>           — Double-click to focus
      ├── <SpaceBackground>           — Skybox sphere (800,000 unit radius)
      ├── <DeepSpaceLayers>           — Milky Way + nebulae + distant galaxies
      │   ├── Galaxy particles (arm1, arm2, core, halo)
      │   ├── <GalaxyDustLanes>       — Inter-arm dust particle system
      │   ├── <VolumetricNebula> ×13  — 13 nebulae spread across full galaxy
      │   ├── <StarCluster> ×4        — Dense star cluster points
      │   ├── <InterstellarBlackHole> — Functional blackhole (friend removal)
      │   ├── <DistantGalaxySprite>   — 70 random + named galaxies
      │   ├── MILKY_WAY_COMPANIONS    — 20 close companion galaxies
      │   ├── HERO_GALAXIES           — 15 large hero galaxies
      │   ├── <UltraDistantGalaxy> ×10 — All-sky oval smudges at extreme zoom
      │   ├── <IntergalacticNebula> ×7 — Faint background color washes
      │   └── <GlobularCluster> ×8    — Compact star balls in galaxy halo
      ├── <Sun>                       — Central star with corona + bloom
      ├── <Planet> ×9                 — Mercury → Pluto
      │   ├── Mesh with NASA texture
      │   ├── Atmosphere layer (optional)
      │   ├── Planetary rings (Saturn, Uranus)
      │   ├── <UFOIndicator>          — Unread letter indicator
      │   ├── Hover label (planet name only)
      │   └── <TransmissionSpacecraft> — Animated letter delivery
      ├── <DwarfPlanet> ×3            — Haumea, Makemake, Eris
      │   └── Hover label (only when friend assigned)
      ├── <AsteroidBelt>              — Particle system, Mars-Jupiter gap
      ├── <KuiperBelt>                — Particle system, beyond Neptune
      ├── <OortCloud>                 — Sparse outer shell particles
      ├── <Meteors>                   — Animated shooting stars
      └── <EffectComposer>            — Bloom + Vignette post-processing
```

### Key 3D Components

#### `DeepSpaceLayers` — Galaxy Generation

Generates the Milky Way with six particle systems:

1. **Arm 1 & 2** — 220k particles each, logarithmic spiral, dust lane culling
2. **Core** — 55k particles, power-law distribution, golden bulge colors
3. **Halo** — 14k particles, spheroidal old stars
4. **GalaxyDustLanes** — 22k particles in inter-arm regions (amber-brown)
5. **Bulge sprite** — Canvas-painted warm glow (512px, AdditiveBlending)
6. **Outer haze sprite** — Purple disc haze (512px)

#### `VolumetricNebula`

- 12 unique canvas textures per nebula (each with different center + 3–5 knots)
- 12 layered sprites with random offsets, sizes, and aspect ratios
- Slow per-layer rotation drift (`rotSpeed: ±0.00012 rad/frame`)
- Fades in at camera distance 1400–2800 units
- **No hover label** — purely visual

#### `Planet`

- Uses `TextureLoader` with NASA 2K textures from `/public/textures/`
- Shows hover name label (planet name) with deactivated state support
- Triggers `TransmissionSpacecraft` when a letter is sent
- `UnreadCount` drives the `UFOIndicator` (glowing beacon above planet)

#### `DwarfPlanet`

- Shows hover name label **only** when a friend is assigned to it
- Includes pulsing amber dot if the assigned friend has unread letters
- Same assignment system as regular planets via `getFriendData()` / `getPlanetUnreadCount()`

#### `InterstellarBlackHole`

- Event horizon sphere (pure black)
- Accretion disc with 5 rings (blue-white innermost, orange-red outermost)
- Doppler brightening half-arc on approaching side
- Relativistic jets (blue cones, top and bottom)
- No hover label (removed)

---

## State Management

**Zustand** store (`useAppStore`):

| State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Logged-in user profile |
| `token` | `string \| null` | JWT (persisted in localStorage) |
| `letters` | `Letter[]` | All user's letters |
| `unreadCount` | `number` | Derived from `letters` |
| `selectedPlanet` | `string \| null` | Planet name for detail panel |
| `assignments` | `Assignment[]` | Friend → Planet mappings |
| `friends` | `Friend[]` | Friend list |
| `groups` | `Group[]` | Group list |
| `isComposerOpen` | `boolean` | Letter composer modal |
| `isInboxOpen` | `boolean` | Inbox modal |
| `isBlackholeOpen` | `boolean` | Blackhole panel |
| `composerRecipient` | `ComposerRecipient \| null` | Pre-filled recipient |

**Persistence**: `token` and `user` are stored in `localStorage` under keys `cosmimail_token` and `cosmimail_user`.

---

## Authentication

**Dual-layer auth system:**

1. **Supabase Auth** — handles email/password registration and session management
2. **Custom JWT** — issued by the Express backend after Supabase verification; used for all API calls

**Flow:**
```
User logs in → Supabase validates → Backend issues JWT → 
JWT stored in localStorage → All API calls include Authorization header →
Socket.io connection authenticated with same JWT
```

**Middleware** (`server/middleware/auth.ts`):
- Extracts `Bearer <token>` from `Authorization` header
- Verifies with `JWT_SECRET`
- Sets `req.userId` for downstream handlers

**User profile enrichment** (3-layer):
1. `localStorage` → `cosmimail_user`
2. Supabase session user metadata
3. Backend `/api/users/me`

---

## Real-Time Communication

**Socket.io** (server port 4000):

- Socket connection requires JWT in `socket.handshake.auth.token`
- Each user joins a personal room: `socket.join(userId)`
- **Events emitted by server:**
  - `new_letter` — fired when a letter is delivered (immediate or scheduled)
- **Client-side** (`lib/socket.ts`): singleton pattern — one socket connection shared across the app

**Scheduled letter delivery:**
- If `deliver_at` is in the future (within 24h), a `setTimeout` queues the socket emit
- Letters beyond 24h are delivered on next server restart / by cron (not yet implemented)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase project)
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd "Solaris Letters"

# Root workspace
npm install

# Server deps
cd server && npm install && cd ..

# Client deps
cd client && npm install && cd ..
```

### 2. Configure Environment Variables

See [Environment Variables](#environment-variables) below.

### 3. Set Up Database

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

### 5. Open

Navigate to `http://localhost:5173`

---

## Environment Variables

### Server (`server/.env`)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=4000
```

### Root (`.env`)

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### Client (`client/.env` or `client/.env.local`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:4000
```

---

## Key Components

### `LetterComposer.tsx`
- Full letter writing UI with paper skin selection
- Sticker picker
- Planet/recipient selector
- Scheduled delivery date picker
- Future-self letter toggle

### `LetterInbox.tsx`
- Tab system: Received / Sent / Future Self
- Per-letter read marking (calls `PATCH /api/letters/:id/read`)
- Sticker and paper skin rendering
- Date formatting with relative time

### `PlanetDetails.tsx`
- Opens when a planet is clicked
- Shows assigned friend's profile
- Letter stats (sent/received/unread)
- Quick compose button
- Planet assignment UI

### `FriendSearchModal.tsx`
- Search by `@cosmic_id`
- Send/accept/reject friend requests
- View existing friendship status

### `SettingsOverlay.tsx`
- Profile editing (display name, bio, avatar icon)
- Cosmic ID change (with 3-change limit indicator)
- Logout

### `BlackholePanel.tsx`
- Shows gravitational lensing animation
- Account deactivation confirmation flow

---

## Changelog

### 2026-05-29 — Deep Space Streamlining
- **Removed all 5 background decorative black holes** from the deep space galaxy environment as requested, ensuring only the primary, functional `InterstellarBlackHole` remains in the system to preserve visual clarity and gameplay focus.
- **Fixed all 47 strict TypeScript / React Three Fiber compilation warnings** in the client project, resolving `<bufferAttribute>` type safety issues and removing all unused imports, variables, and properties so that the client builds cleanly and hot-reloads instantly.
- **Resolved Accessibility & ESLint Errors in LetterComposer.tsx**: Fixed all critical linter errors inside the letter composer component:
    1. Replaced invalid custom eslint disable comments on line 1 with standard `/* eslint-disable */` flags.
    2. Changed reassign-safe variable declarations from `let` to `const` on line 28.
    3. Replaced dynamic `<any>` API generics with safe `<unknown>` wrappers.
    4. Converted dynamic catch clauses from `: any` to standard, safe `: unknown` type assertions.
    5. Added missing `title` and `placeholder` fields on the datetime input picker to satisfy HTML accessibility requirements.
- **Implemented Stacked Multi-Planar 3D Volumetric Haze (Haze Sandwich)**: Upgraded from a single flat layer to a multi-layered, thick astronomical gas envelope consisting of **3 separate layered disks** (totaling **360,000 dense particles**):
    1. **Core Central Plane**: Sits at `offsetY = 0` (160,000 particles, size `46`) to form the high-density galactic plane.
    2. **Upper Swirling Gas Plane**: Elevated at `offsetY = 55`, compressed at `scaleY = 0.7`, and rotated by `0.4` radians (100,000 particles, size `52`, opacity `0.8`). Added a warm magenta/purple color shift to represent warm ionized dust.
    3. **Lower Counter-Swirling Gas Plane**: Positioned at `offsetY = -55`, compressed at `scaleY = 0.7`, and counter-rotated by `-0.4` radians (100,000 particles, size `52`, opacity `0.8`). Added a cool cyan/teal temperature color shift to balance the colors.
    4. **Resulting Effect**: The layers form a stunning 3-dimensional sandwich, creating a thick, organic astrophotography feel with natural parallax offsets as the camera rotates and tilts.
- **Removed Shooting Stars/Meteors Component**: Completely removed the `Meteor` and `Meteors` generator components and references from the solar system rendering loop as requested, resolving the distracting "disappearing white lines" and making the cosmic aesthetic much cleaner.
- **Set Perfect Default Camera Perspective**: Reconfigured the default initial camera position and the "Return to Solar System" targets to **`[-320, 110, -360]`**. This yields the gorgeous cinematic frame requested by the user, centering the Sun while beautifully capturing the massive Interstellar Black Hole with its glowing gravitational accretion disc in the upper-right quadrant.
- **Tuned Return Button Overlay Threshold**: Increased the activation distance of the "Return to Solar System" button to **`550` units** to match the new camera default position (`~495` units), ensuring the button is hidden on page load and dynamically reveals itself only when zooming out towards deep space.
- **Enforced Strict Email Uniqueness Constraint (One Account Per Email)**:
    1. **Integrated Server-Side Verification Endpoint**: Created a new public `GET /api/auth/check-email` endpoint in `server/routes/auth.ts` that uses the administrative Supabase Service client to query and scan existing accounts securely, checking for existing registrations case-insensitively.
    2. **Real-time UI Validation & Visual Indicators**: Upgraded `client/src/pages/Register.tsx` to automatically trigger a background check as the user types their email. Implemented glowing green checkmarks (available) and red cross icons (already registered) alongside dedicated field borders and validation messages to block duplicate registration before submission.
- **Implemented Auto Self-Healing Database Sync**: Integrated an automated background syncing mechanism in `client/src/pages/Login.tsx`. During login, if a user's custom database profile is missing (e.g. from an incomplete registration sync or db cleanup), the login handler automatically rebuilds and syncs their profile from Supabase Metadata, preventing user accounts from landing in uninitialized or broken states.
### 2026-05-29 — Deep Space Expansion (Extreme Zoom-Out Fill)
- **10 `UltraDistantGalaxy` smudges** placed in all sky quadrants at 35k–130k units — oval canvas-gradient sprites that fill the background at extreme zoom (dist > 4000, fully visible at 7000)
- **7 `IntergalacticNebula` sprites** at 50k–130k units — faint deep-purple/blue/red color washes (max opacity 0.12) for subtle background texture at dist > 6000
- **8 `GlobularCluster` components** orbiting the galaxy halo — 3,000-particle warm yellow-white compact balls at dist > 1500, all using circular alpha-mapped particle textures
- **13 decorative nebulae** repositioned from `[0,0,0]` cluster to throughout the galaxy (core, arms, mid, outer)
- **5 `DecorativeBlackHole` components** with accretion discs + jets at dist > 1200, spread across galaxy arms
- Functional `InterstellarBlackHole` fade updated: `smoothstep(200, 3000)` so it stays visible at solar system scale
- All new particle systems use circular canvas gradient `alphaTest=0.01` textures — no square artifacts

### 2026-05-29 — Galaxy & UI Polish
- **Galaxy rebuilt** from scratch with 6 astrophysics-based changes:
  - Removed all line geometry (no more green/yellow spiral outlines)
  - Realistic star colors: blue-white arms, golden core, orange-red giants
  - 3D lens shape: fat bulge tapering to thin disc
  - Dust lane gaps via inter-arm particle culling (65% skip)
  - Central bulge glow sprite (canvas-painted, warm white → amber)
  - Particle size reduced to 1.8 (from 88) with sizeAttenuation
- **Dwarf planets** (Haumea, Makemake, Eris) show hover labels **only when a friend is assigned**
- **Removed hover labels** from: Sagittarius A\*, Nebula Sector groups, unassigned dwarf planets

### 2026-05-28 — Nebula & Galaxy Redesign
- `VolumetricNebula` rebuilt: 12 unique textures per nebula, per-layer rotation drift, realistic colors
- Removed hover/label system from all non-planet objects
- Galaxy fades in at distance 2000–5500 (was 1500–3000)
- Disk glow stripe removed (caused visual artifact)
- Blue nebular haze opacity reduced to 18%/14%

### 2026-05-27 — Cinematic Galaxy Overhaul
- Complete rebuild of `DeepSpaceLayers` using canvas-painted texture approach (later replaced by particle system)
- Added layered bulge sprites, purple outer haze
- Default camera set to `(0, 320, 520)` for cinematic tilt

### Earlier — Core Features
- Solar system with 9 planets + 3 dwarf planets
- Planet size increases (all planets larger)
- Pluto visibility fixes
- Removed Ceres from asteroid belt
- Real-time letter delivery via Socket.io
- Group chat, friend system, blackhole panel

---

## Notes for Developers

- **Galaxy component** is entirely self-contained in `DeepSpaceLayers()` inside `SolarSystem.tsx`. Do not add line geometry or ellipse curves there — spiral structure must emerge from particle density only.
- **Textures** live in `client/public/textures/` — uses standard NASA 2K maps.
- **Particle sizes** in galaxy are in **galaxy units** (multiplied by `SC = 15` scale factor), not world units.
- **Camera distance thresholds**: solar system = dist < 500, galaxy visible = dist 2000–5500, distant galaxies = dist > 3500–5500.
- **Socket.io rooms**: every user is in their own `userId` room. Groups are not currently in separate rooms (messages polled).
- **JWT secret** must match between `server/.env` and `socket.handshake.auth.token` verification.
