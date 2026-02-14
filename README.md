# People Pleaser Polling

Anonymous group polling with sliders. Create a poll, share the link, and let your friends vote on a scale from -1 (against) to +1 (for). When everyone's voted, end the poll to reveal the winner.

**Live at [pppolling.com](https://pppolling.com)**

## Features

- Create polls with unlimited options
- Vote using -1 to +1 sliders for each option
- Real-time vote count updates
- Hold-to-end button prevents accidental poll ending
- Confetti celebration when results are revealed
- Optional average score breakdown
- Dark/light mode toggle
- Installable as a PWA
- Duplicate vote prevention via localStorage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Storage**: Upstash Redis
- **Real-time**: Client-side polling (3s interval)
- **Deployment**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Local development uses in-memory storage — no Redis setup required.

## Environment Variables

For production, connect an Upstash Redis store via the Vercel dashboard. The following env vars are used:

- `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL`
- `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_TOKEN`
