# Generation Worker

PostgreSQL-based image generation worker for Railway deployment.

## Architecture

```
┌─────────────┐     ┌────────────────────────┐     ┌─────────────┐
│   Vercel    │────▶│  PostgreSQL (Neon)     │◀────│   Railway   │
│  (Next.js)  │     │  generation_job table  │     │   Worker    │
└─────────────┘     └────────────────────────┘     └──────┬──────┘
                                                          │
                                                          ▼
                                                   ┌─────────────┐
                                                   │ Gemini API  │
                                                   └─────────────┘
```

## Environment Variables

| Variable               | Required | Default | Description                    |
| ---------------------- | -------- | ------- | ------------------------------ |
| `DATABASE_URL`         | Yes      | -       | PostgreSQL connection string   |
| `GEMINI_API_KEY`       | Yes      | -       | Google AI Studio API key       |
| `R2_ACCOUNT_ID`        | Yes      | -       | Cloudflare R2 account          |
| `R2_ACCESS_KEY_ID`     | Yes      | -       | R2 access key                  |
| `R2_SECRET_ACCESS_KEY` | Yes      | -       | R2 secret key                  |
| `R2_BUCKET`            | Yes      | -       | R2 bucket name                 |
| `R2_PUBLIC_URL`        | Yes      | -       | Public URL for R2 bucket       |
| `WORKER_CONCURRENCY`   | No       | 5       | Number of concurrent jobs      |
| `MAX_JOBS_PER_MINUTE`  | No       | 60      | Rate limit (match Gemini tier) |
| `POLL_INTERVAL_MS`     | No       | 1000    | Job polling interval           |
| `PORT`                 | No       | 8080    | Health check server port       |

## Local Development

```bash
# From monorepo root
yarn workspace @repo/generation-worker dev
```

## Deploy to Railway

1. Create a new Railway project
2. Connect your GitHub repo
3. Set the root directory to `services/generation-worker`
4. Add environment variables
5. Deploy

## Health Check

GET `/health` returns:

```json
{ "status": "healthy", "worker": "running" }
```

## Scaling

| Gemini Tier   | RPM  | Recommended Config                                  |
| ------------- | ---- | --------------------------------------------------- |
| Free          | 10   | `MAX_JOBS_PER_MINUTE=10`, `WORKER_CONCURRENCY=2`    |
| Pay-as-you-go | 60   | `MAX_JOBS_PER_MINUTE=60`, `WORKER_CONCURRENCY=5`    |
| Scale         | 1000 | `MAX_JOBS_PER_MINUTE=1000`, `WORKER_CONCURRENCY=50` |

For higher throughput, deploy multiple Railway instances.
