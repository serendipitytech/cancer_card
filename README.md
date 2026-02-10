# The Cancer Card

A mobile-first Progressive Web App that gamifies asking for help during cancer treatment. Cancer patients ("Card Holders") spend points to request tasks from their support "Crew." Three request modes: Direct Assignment, Open Bucket, and Reverse Auction. Patients earn points back through self-care milestones.

## Tech Stack

- **Next.js 16** (App Router, standalone output for Docker)
- **SQLite** via better-sqlite3 + Drizzle ORM (WAL mode)
- **Auth.js** (next-auth v5) with password login + JWT sessions
- **Tailwind CSS v4** with custom design tokens
- **Framer Motion** for animations
- **Zod** for API input validation
- **Resend** for transactional email

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- A domain name pointed at the server (for HTTPS)
- A reverse proxy (Traefik, Nginx Proxy Manager, etc.) already running

### 1. Clone the repo

```bash
cd /opt  # or your preferred Docker project directory
git clone git@github.com:serendipitytech/cancer_card.git
cd cancer_card
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` with production values:

```bash
# REQUIRED - generate with: openssl rand -base64 32
AUTH_SECRET=<your-generated-secret>

# REQUIRED - your production URL (must match reverse proxy config)
AUTH_URL=https://yourdomain.com

# Database path inside the container (do not change)
DATABASE_PATH=/data/app.db

# Email via Resend (optional for initial testing, required for notifications)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# Public app URL (same as AUTH_URL)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Build and start

```bash
docker compose up -d --build
```

This will:
- Build a multi-stage Docker image (~150MB) based on `node:20-alpine`
- Compile `better-sqlite3` native bindings during build
- Create a named Docker volume `cancer_card_data` for SQLite persistence
- Start the app on **port 3000** inside the container

### 4. Reverse proxy configuration

The container exposes port **3000**. Route your domain to it via your reverse proxy.

**Traefik (Docker labels)** - add to the `cancer-card` service in `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.cancer-card.rule=Host(`yourdomain.com`)"
  - "traefik.http.routers.cancer-card.entrypoints=websecure"
  - "traefik.http.routers.cancer-card.tls.certresolver=letsencrypt"
  - "traefik.http.services.cancer-card.loadbalancer.server.port=3000"
```

**Nginx** - add a server block:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Note:** If the container needs to be on a shared Docker network with your reverse proxy:

```yaml
# Add to docker-compose.yml under the cancer-card service:
networks:
  - your_proxy_network
  - default

# And at the bottom of docker-compose.yml:
networks:
  your_proxy_network:
    external: true
```

### 5. Verify

```bash
# Check container is running
docker compose ps

# Watch logs
docker compose logs -f cancer-card

# Health check
curl http://localhost:3000
```

### 6. Updates

```bash
cd /opt/cancer_card  # or wherever you cloned it
git pull
docker compose up -d --build
```

The SQLite data persists in the Docker volume across rebuilds.

## Container Details

| Setting | Value |
|---------|-------|
| Base image | `node:20-alpine` |
| Internal port | `3000` |
| Exposed port | `3000` (configurable in docker-compose.yml) |
| Data volume | `cancer_card_data` mounted at `/data` |
| SQLite path | `/data/app.db` |
| Health check | `wget -q --spider http://localhost:3000/` every 30s |
| User | `nextjs` (UID 1001, non-root) |

## SQLite Backup

The database lives in the Docker volume. To back it up:

```bash
# One-time backup
docker compose exec cancer-card cp /data/app.db /data/app.db.backup

# Or copy to host
docker cp cancer-card:/data/app.db ./backups/app-$(date +%Y%m%d).db
```

For automated backups, add a cron job on the host:

```bash
# crontab -e
0 2 * * * docker cp cancer-card:/data/app.db /opt/backups/cancer-card/app-$(date +\%Y\%m\%d).db
```

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with dev values (AUTH_SECRET can be any string for dev)
npm run db:push     # Create tables
npm run db:seed     # Seed default data
npm run dev         # Start on http://localhost:3000
```

## Project Documentation

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project conventions for Claude Code |
| `PLAN.md` | Original implementation plan |
| `RECAP.md` | Full build recap (tech stack, file structure, gotchas) |
| `ROADMAP.md` | Feature roadmap with phases and priorities |
