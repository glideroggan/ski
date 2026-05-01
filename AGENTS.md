# ski — AI Agent Guidelines

A TypeScript ski game (p5.js-style, esbuild-bundled) served as a static site via nginx.
Playable at `https://nyviken.se/games/ski`. Deployer workload: `game-ski`.

---

## Stack

| Layer | Tech |
|---|---|
| Language | TypeScript |
| Bundler | esbuild (`esbuild.config.js`) |
| Entry | `src/sketch.ts` |
| Output | `dist/` |
| Package manager | Yarn |
| Serving | nginx (Docker, static files) |

---

## Build & Dev

```sh
# Install dependencies
yarn install

# Development (watch mode)
yarn dev

# Production build
yarn build
```

## Docker

```sh
# Build image
docker build -t glideroggan/ski-app:latest .

# Push to Docker Hub
docker push glideroggan/ski-app:latest
```

- Dockerfile: two-stage — `node:22` builds, `nginx:stable-alpine3.23-slim` serves
- Compose service: `app` on port `8080:80` (local), `3001` inside container

## Deploy to Production

```sh
# Trigger deployer hook
Invoke-RestMethod -Method Post -Uri "https://nyviken.se/deployer-api/hook" `
  -Headers @{ "X-Hook-Secret" = $env:DEPLOYER_HOOK_SECRET } `
  -ContentType "application/json" `
  -Body '{"workload":"game-ski"}'
```

## Source Structure

```
src/
  sketch.ts           # Entry point — p5 setup/draw loop
  game.ts             # Core game logic
  entityManager.ts    # Manages obstacles, gates, skiers
  player/             # Player state and controls
  skier/              # Skier sprite logic
  collision/          # Collision detection
  slalomGate.ts       # Slalom gate entity
  difficultyManager.ts
  weather/            # Weather effects
dist/                 # Built output (committed for reference)
assets/               # Sprites and images
```

## Conventions

- **No framework** — pure TypeScript classes, no React/Vue/Angular
- **p5.js patterns** — setup/draw paradigm via `sketch.ts`
- **Sprites** via `spriteAtlas.ts` / `sprite.ts` — atlas-based sprite rendering
- **Do not commit `dist/` changes manually** — the Docker build runs `yarn build`; dist in repo is reference only

## Vulnerability Remediation

- Base image bumps are **Tier 1** — update `dockerfile` `FROM` line, rebuild, push, trigger hook
- No tests to run before push (static site)
- After push, re-scan: `GET https://nyviken.se/deployer-api/vulnerabilities/game-ski`
