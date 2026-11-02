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

2. Set `MONGODB_URI` to your MongoDB connection string and replace `JWT_SECRET` with a long, random secret. The example uses a local database at `mongodb://127.0.0.1:27017/careerconnect`.
3. Install dependencies and start both the API and frontend:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173). The API runs on port 5000 and Vite proxies `/api` requests to it.

The API starts when MongoDB is unavailable, but database-backed features return an explicit error until a database is configured and connected. Check `http://localhost:5000/api/health` for the API and database connection status.

## Optional email delivery

Email verification and password recovery work without an SMTP provider during local development: the app shows a time-limited development token/link that can be used to verify an account or reset its password. For actual email delivery, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` in `.env`. Never use development tokens or demo accounts in a production deployment.

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

- Email verification, login, password recovery, account deactivation and role-based candidate, recruiter and admin access.
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
- `npm.cmd start` — start Express and serve `dist` when it exists
- `npm.cmd run seed` — insert local-development sample data

For a production-style local run, set secure production environment values, configure SMTP, then run `npm.cmd run build` followed by `npm.cmd start`.

## Environment and data storage

See [.env.example](./.env.example). Resume PDFs are stored in the private `uploads/resumes` directory and are not served as static files. Back up the MongoDB database and private upload directory together. `.env`, `uploads/` and `dist/` are excluded from version control.
