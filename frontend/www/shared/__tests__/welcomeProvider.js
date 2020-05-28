import {waitFor, render} from '@testing-library/react'
import WelcomeProvider, {reducer} from '../welcomeProvider'
import * as nextRouter from 'next/router'
import ProfileProvider from '../profileContext'

const mockReplace = jest.fn()

nextRouter.useRouter = jest.fn()
nextRouter.useRouter.mockImplementation(() => ({
  route: '/welcome/create-password',
  pathname: '/welcome/create-password',
  replace: mockReplace,
}))

const mockHasProfile = jest.fn()
mockHasProfile.mockReturnValue(true)

const mockRpc = {
  getProfile: () =>
    Promise.resolve({
      getProfile: () => new Profile(),
      hasProfile: mockHasProfile,
    }),
}

describe('Welcome Provider', () => {
  test('should the reducer not delete current state when changing other branch', async () => {
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
      `)
  })

  test('should redirect to the library if profile is available', async () => {
    render(
      <ProfileProvider rpc={mockRpc}>
        <WelcomeProvider />
      </ProfileProvider>,
    )

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
    expect(mockReplace).toHaveBeenCalledWith('/drafts')
  })
})
