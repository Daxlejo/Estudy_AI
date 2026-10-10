# EstudyAI - Local Backend

This is the local backend application for EstudyAI, built with NestJS and TypeScript.
It is designed to run locally on the user's machine alongside the frontend desktop application.

## Technologies

- Node.js
- TypeScript
- NestJS
- SQLite (via Prisma - to be configured)
- Jest (Testing)
- ESLint + Prettier (Code Quality)

## Persistence

The backend relies on **SQLite** and **Prisma ORM** for local persistence.
For development, the database is stored at `backend/dev.db`.
*Note: In the final desktop application build, the database will reside in the operating system's application-data directory.*

### Database Workflow

Make sure you copy `.env.example` to `.env` to configure your `DATABASE_URL`.

**1. Generate Prisma Client:**
```bash
npx prisma generate
```

**2. Run Migrations (Development):**
```bash
npx prisma migrate dev
```

## Installation

```bash
npm install
```

## Running the application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## Build

```bash
npm run build
```
