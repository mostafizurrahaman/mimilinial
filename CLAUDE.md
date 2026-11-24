# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is **Bun** (`bun.lock`), but the dev server runs through `tsx`. Package manager is Bun.

- Install: `bun install`
- Dev server (watch mode): `bun run dev` (runs `bunx tsx --watch ./src/server.ts`)
- Seed sample data: `bun run seed`
- Type check: `bunx tsc --noEmit` (tsconfig has `noEmit`; there is no script for it)
- Scaffold a new module: `node scripts/generate-module.js <ModuleName>` (generates the Pascal-case folder with validations/constants/interfaces/model/routes/controllers/services, and refuses to overwrite an existing module)

There is **no build, lint, or test setup** in this repo: no `build` or `test` script, no test files, no ESLint/Prettier/Biome config. There is no single-test command to run. Don't invent one; add tooling only if asked.

## Environment

- `src/app/configs/index.ts` loads `.env.${NODE_ENV}` from the working directory (default `development`). `.env.development` exists locally; `.env.example` lists the keys.
- All env vars are validated with zod at import time. A missing or malformed value stops startup, so check it there first.
- `.env*` is gitignored. Never copy values from `.env.development` or `.env.example` into code, docs, or commits.
- Path alias: `@/*` → `src/*` (configured in `tsconfig.json`; works at runtime via tsx).

## Architecture

**Startup** (`src/server.ts`): `connectDB` → `sendSuperAdmin` (seeds the super admin from env) → `app.listen` → `schedularUtils.startSchedules()`. The only scheduled job is `removeOrphanedImages` (node-schedule, 14:00 Asia/Dhaka, in `modules/Media`).

- `connectDB` (`src/app/utils/connect-db.ts`) catches its own connection error and only logs it. `server.ts` therefore still proceeds to seed and listen when the database is down. Keep this in mind when debugging a "server up but nothing works" report.
- Process-level handlers in `server.ts` exit the process on `unhandledRejection` and `uncaughtException`.

**HTTP app** (`src/app.ts`): morgan → helmet → `express.json` → cookie-parser → CORS (currently `origin: "*"`, with a TODO in the code to make it dynamic). All API routes are mounted under `/api/v1` through `src/app/routes/index.ts`, which maps each module's router to a path (`/auth`, `/questions`, `/question-mapping`, etc.). Errors go to `middlewares/global-error-handler.ts`, and unmatched routes to `not-found.ts`.

**Module layout** (`src/app/modules/<Name>/`): each feature follows the same chain, so read one module to learn them all:

1. `*.validations.ts`: zod schemas with `body` / `params` / `query` keys, applied with the `validateRequest` middleware
2. `*.routes.ts`: `auth(...roles)` → `validateRequest(schema)` → controller
3. `*.controllers.ts`: wraps handlers in `catchAsync` and responds with `sendResponse`
4. `*.services.ts`: business logic and Mongoose queries
5. `*.model.ts` / `*.interfaces.ts` / `*.constants.ts`
6. `index.ts`: re-exports everything; `routes/index.ts` imports from here

**Auth**: `auth()` in `src/app/middlewares/auth.ts` reads the `Bearer` access token, verifies it with `ACCESS_TOKEN_SECRET`, then loads the user by email on every request and rejects blocked or deleted accounts. Roles are `UserRoles` in `modules/User`. Content-authoring routes are typically limited to `ADMIN` and `SUPER_ADMIN`.

**Question data model** is split into three parts, which is the main thing to understand before touching question code:

- `Question` (`modules/Questions`): identity and metadata (code, slug, type, difficulty, status, passage ref, author).
- `QuestionVersion` (`modules/QuestionVersion`): content history. One base model with Mongoose **discriminators** keyed on `type` (`single_mcq`, `multi_mcq`, `true_false`, `fill_blank`, `matching`, `ordering`). Each version has `versionNumber`, `isCurrent`, and a `contentHash` that is computed in a pre-validate hook and used for duplicate detection (`checkDuplicateByHash`).
- `QuestionMapping` (`modules/QuestionMapping`): links questions to the syllabus hierarchy (Category → Track → Subject → Topic, with Collection as a separate module). This is the largest service file in the repo, and it includes aggregation pipelines that shape `questionVersion` output per type.

Question-type-specific fields (`options`, `pairs`, `orderingItems`, `acceptedAnswers`) appear only for their matching type. The aggregation uses `$$REMOVE` to drop the rest.

## Design docs

- `docs/question-model-guide.md`: rationale for the Question/QuestionVersion split, slugs, HTML handling in stems, and content hashing. The code matches it.
- `docs/NEXT_STEPS_EXAM_SYSTEM.md`: planned exam engine (`Exam`, `ExamAttempt`, `ExamResult`). **Not implemented yet**: there is no Exam module in `src/app/modules`. Treat it as a spec, not as existing code.
- `README.md` is mostly Bengali-language notes on SEO meta fields per model, plus pagination query params. It has no setup instructions.
