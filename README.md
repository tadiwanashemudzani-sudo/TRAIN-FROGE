# TrainForge — Complete GitHub-ready video app

## What is included
- Futuristic dashboard UI
- Trends, Script, Storyboard and Export panels
- Real video-generation backend
- Server-side API-key protection
- Progress/status polling from the browser
- Download/open generated video result
- One-command local start

## Important deployment note
GitHub Pages can host the frontend, but it cannot run the Node.js backend or safely store `FAL_KEY`.
For actual video generation, deploy the whole project (including `server.js`) to a Node-capable host such as Render, Railway, Fly.io, or another server platform.

## Setup
1. Copy `.env.example` to `.env`.
2. Put your FAL API key in `.env`:
   `FAL_KEY=...`
3. Run:
   `npm install`
4. Run:
   `npm start`
5. Open:
   `http://localhost:3000`

## GitHub
Upload the project files to your repository. Do NOT commit `.env`.

## Video generation
The backend calls the configured FAL video model. The default is WAN 2.7 text-to-video.
Change `FAL_VIDEO_MODEL` in `.env` if you later want another supported FAL video model.

## API routes
- `GET /api/health`
- `POST /api/generate`
- `GET /api/jobs/:id`

The browser never receives the FAL API key.
