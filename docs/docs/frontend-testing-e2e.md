# Frontend E2E Testing

This app uses Playwright for E2E testing.

## Running E2E tests

```bash
cd <REPO>
yarn desktop:package
yarn desktop:e2e
```

## Create new E2E tests

1. create a new file inside `frontend/apps/desktop/tests`. the filename should end in `e2e.ts`. This is important because E2E tests are set as a separate project based on the filename. We recomment you copy `e2e.template.ts` to start.
2. write your tests.
3. make sure it passes and commit!

## Setup Explanation

- Playwright is testing a Built app. this means that in order to run the E2E tests the app MUST be built.
- the path in which the backend DB is stored changes depending on the environment in which the test will run:
  - when tests are run in CI, the path is set to a temp directory (using `mkdtempSync(join(tmpdir(), 'hm-'))` ([source](https://nodejs.org/api/fs.html#fsmkdtempsyncprefix-options)))
  - when tests are run Locally, the path is set to the production path. we can change this in the future.