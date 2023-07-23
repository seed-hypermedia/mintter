# Frontend Testing

In mintter we have currently 3 types of testing:

1. Static type testing with Typescript
2. Unit testing functions with [vitest](https://vitest.dev/)
3. UI testing with [Cypress](https://www.cypress.io/) (DEPRECATED)

## Run tests locally

```bash
pnpm test                   # will run all unit and ui testing (CI and `headless` mode)
pnpm app test:unit:run      # run unit tests in CI mode (vitest)
pnpm app test:unit:watch    # run unit tests in watch mode
pnpm app test:ui:run        # run ui tests in `headless` mode
pnpm app test:ui:open       # run ui tests opening the Cypress dashboard
```

## Testing conventions

1. **test files should be colocated**: you should add your tests files in the closest `__tests__` folder (if any, create one)
2. **name convention for testing typescript**: `*.test.ts**`
3. **name convention for testing UI components**: `*.cy.ts**`
4. **use `data-testid` to target UI elements**: This prevents tests from failing if the UI implementation changes slightly.
5. **when writing Vitest tests, remember imports**: Vitest intentionally does not add global tools like `describe`, `test` or `expect`. you need to explicitly import them (checkout the example)

## UI Testing setup

By default by calling `cy.mount()` it will mock most of the initial backend calls (account, info, file lists...), but if you want to mock a specific call with a new value, you can call the `createTestQueryClient()` function to get access to the client.

```tsx
describe('awesome test', () => {
  test('the test', () => {
    let {client} = createTestQueryClient({
      publication: { // ...
    })
    cy.mount(<Component />, {
      client // make sure to pass the client as an option to the mount function
    })
    // all your assertions chained here
  }
})
```

`createTestQueryClient` can accept a certain number of parameters to mock and it will return them alongside with the `client`, so you can assert tests with them.

checkout the `test/utils` (frontend/app/src/test/utils.tsx) file and see how internally works.

We are using [react-query's `QueryClient`](https://tanstack.com/query/v4/docs/reference/QueryClient) to mock the backend. this way we can test the app almost as if it was running alongisde with the backend and with minimal change from how our users will interact with it. We also use [Cypress component testing](https://docs.cypress.io/guides/component-testing) for the same reason, because our app is running on the native webview, rendering to an actual webview makes more sense in terms of reliability. It's not perfect, but god enough.

## Examples

### Unit test that will run by `vitest`

```ts
// block-to-api.test.ts

import {describe, expect, test} from 'vitest'
import {Block} from '@mintter/app/src/client'
import {
  paragraph,
  Statement,
  statement,
  text,
} from '@app/mttast'

import {blockToApi} from '../block-to-api'

describe('Transform: blockToApi', () => {
  test('should return an empty annotations list', () => {
    let input: Statement = statement({id: 'blockId'}, [
      paragraph([text('Hello world')]),
    ])

    let output: Partial<Block> = {
      id: 'blockId',
      type: 'statement',
      text: 'Hello world',
      attributes: {
        childrenType: 'group',
      },
    }

    expect(blockToApi(input)).toEqual(output)
  })

```

### UI test that does not include any special mock

```tsx
// draft-list-page.cy.tsx

import { DraftList } from "@app/pages/draft-list-page";

// TODO: FIXME
describe("DraftList", () => {
    it("Should show an empty list", () => {
        cy.mount(<DraftList />)
            .get('[data-testid="filelist-title"]')
            .contains("Drafts")
            .get('[data-testid="filelist-empty-label"]')
            .contains("You have no Drafts yet.");
    });
});
```

### UI test that needs a special mock

```tsx
// draft-list-page.cy.tsx

import { DraftList } from "@app/pages/draft-list-page";
import { createTestQueryClient } from "@app/test/utils";

// TODO: FIXME
describe("DraftList", () => {
    it("should render the draft list returned", () => {
        let { client } = createTestQueryClient({
            draftList: [
                {
                    id: "1",
                    title: "document 1",
                    subtitle: "",
                    author: "testauthor",
                    createTime: new Date(),
                    updateTime: new Date(),
                    publishTime: new Date(),
                    children: [],
                },
                {
                    id: "2",
                    title: "document 2",
                    subtitle: "",
                    author: "testauthor",
                    createTime: new Date(),
                    updateTime: new Date(),
                    publishTime: new Date(),
                    children: [],
                },
            ],
        });

        cy.mount(<DraftList />, {
            client,
        })
            .get('[data-testid="filelist-list"]')
            .children()
            .should("have.length", 2);
    });
});
```
