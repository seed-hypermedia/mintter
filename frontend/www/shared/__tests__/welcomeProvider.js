import {waitFor} from '@testing-library/react'
import WelcomeProvider, {reducer} from '../welcomeProvider'

describe('Welcome Provider', () => {
  test('should the reducer not delete current state when changing other branch', async () => {
    await waitFor(() =>
      expect(
        reducer(
          {mnemonicList: ['a', 'b', 'c']},
          {type: 'aezeedPassphrase', payload: 'abc'},
        ),
      ).toMatchInlineSnapshot(`
        Object {
          "aezeedPassphrase": "abc",
          "mnemonicList": Array [
            "a",
            "b",
            "c",
          ],
        }
      `),
    )
  })

  xtest('should redirect to the library if profile is available', () => {})
})
