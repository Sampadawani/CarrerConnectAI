# CareerConnect AI

A full-stack career and recruitment platform for candidates, recruiters and administrators. It is built with React, Vite, Express and MongoDB.

## Requirements

- Node.js 20 or newer and npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Run on Windows

1. In PowerShell, copy the example environment file and open it:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

2. Set `MONGODB_URI` to your MongoDB connection string and replace `JWT_SECRET` with a long, random secret. Create a Cloudflare Turnstile widget for `localhost`, then set its site key in `VITE_TURNSTILE_SITE_KEY` and its secret key in `TURNSTILE_SECRET_KEY`. The example uses a local database at `mongodb://127.0.0.1:27017/careerconnect`.
3. Install dependencies and start both the API and frontend:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173). The API runs on port 5000 and Vite proxies `/api` requests to it.

Registration and login require a working CAPTCHA configuration. The site key is public; never put the Turnstile secret in a `VITE_` variable or frontend deployment. Email verification is not required.

The API starts when MongoDB is unavailable, but database-backed features return an explicit error until a database is configured and connected. Check `http://localhost:5000/api/health` for the API and database connection status.

## Password recovery email

Password reset links are shown in the response during local development if email delivery is not configured. For actual email delivery, set `GMAIL_USER` and a Google app password in `GMAIL_APP_PASSWORD`. Do not use development reset tokens or demo accounts in a production deployment.

## Sample data (development only)

With MongoDB configured, run:

```powershell
npm.cmd run seed
```

This idempotently adds marked sample job listings, categories and three demo accounts. All three demo accounts use `CareerConnectDemo2026`:

- Candidate: `candidate@careerconnect.demo`
- Recruiter: `hello@careerconnect.demo`
- Admin: `admin@careerconnect.demo`

The seeded credentials are public and intended only for local testing. Do not seed a shared or production database; change or remove these accounts before exposing a seeded database.

## Implemented workflows

- Cloudflare Turnstile-protected registration and login, password recovery, account deactivation and role-based candidate, recruiter and admin access.
- Public job search, category/location/work-style/type filters, sorting and pagination; recruiter job posting and management.
- Candidate profiles, saved jobs, applications, application status history and recruiter applicant review.
- Private PDF resume upload, basic text/section checks and explainable keyword overlap; profile-based PDF resume creation.
- Career recommendations, persistent learning roadmaps and timed practice assessments.
- Interview scheduling, in-app notifications and preferences, company profiles and recruiter analytics.
- Admin user/job/report/category moderation and audit history; support reports and public About, Contact, Privacy and Terms pages.

Resume review and job recommendations are transparent, rules-based heuristics. The platform does not provide semantic NLP, generative-AI resume analysis, hiring predictions or guaranteed outcomes. Public activity counts come from the connected database; illustrative product principles and the homepage illustration are not testimonials or real recommendations.

## Commands

- `npm.cmd run dev` — run the API and Vite development server
- `npm.cmd run build` — build the production frontend into `dist`
- `npm.cmd test` — run Turnstile verification and middleware tests
- `npm.cmd start` — start Express and serve `dist` when it exists
- `npm.cmd run seed` — insert local-development sample data

For a production-style local run, set secure production environment values and configure Gmail credentials if password-reset email delivery is needed, then run `npm.cmd run build` followed by `npm.cmd start`.

## Cloudflare, Render and Vercel deployment

1. In Cloudflare, create a Turnstile widget. Add `localhost` for local development and the production Vercel hostname (for example, `your-app.vercel.app`) to the widget's allowed hostnames. Copy the widget's **site key** and **secret key**.
2. In Vercel, configure `VITE_TURNSTILE_SITE_KEY` with the site key and `VITE_API_URL` with the Render service's HTTPS origin, without a trailing slash or `/api` (for example, `https://your-api.onrender.com`). Set these for the production environment and redeploy after changing them.
3. In Render, deploy the repository as a Node web service using `npm install` as the build command and `npm start` as the start command. Set `MONGODB_URI`, a strong random `JWT_SECRET`, `TURNSTILE_SECRET_KEY` (the Cloudflare secret), `CLIENT_ORIGIN` (the exact Vercel production origin, including `https://`), and `NODE_ENV=production`. Render provides `PORT`. Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` if password-reset email delivery is needed.
4. Allow the Render service to connect to the MongoDB Atlas cluster using Atlas network access settings. Check the Render `/api/health` endpoint after deployment.

The Turnstile secret and database/JWT/email credentials belong only in Render's server-side environment. Never add them to Vercel `VITE_` variables, source files, or `.env.example`. The Vercel configuration includes SPA routing and a Content Security Policy that permits Turnstile; the Render API also allows the Turnstile script, frame, and verification connections. Vercel preview URLs need to be added to `CLIENT_ORIGIN`/Turnstile allowed hostnames if you want to test authentication on previews.

## Environment and data storage

See [.env.example](./.env.example). Resume PDFs are stored in the private `uploads/resumes` directory and are not served as static files. Back up the MongoDB database and private upload directory together. `.env`, `uploads/` and `dist/` are excluded from version control.
