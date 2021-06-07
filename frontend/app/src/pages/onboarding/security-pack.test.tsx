import '@testing-library/jest-dom/extend-expect'
import {SecurityPack} from './security-pack'
import * as clientMock from '@mintter/client'
import {render, screen, userEvent, waitFor} from '../../test/app-test-utils'
jest.mock('@mintter/client')

const mnemonicTest = ['word-1', 'word-2', 'word-3']

beforeEach(() => {
  const mockGenerateSeed = jest.spyOn(clientMock, 'generateSeed')
  mockGenerateSeed.mockImplementation(() => ({
    mnemonic: mnemonicTest,
  }))
  const mockRegisterAccount = jest.spyOn(clientMock, 'registerAccount')
  mockRegisterAccount.mockImplementation(jest.fn())
})

async function renderWelcomeScreen({
  mnemonic = mnemonicTest,
  ...renderOptions
}: {
  mnemonic?: Array<string>
} = {}) {
  const route = '/welcome'

  const utils = await render(
    <SecurityPack
      prev={() => {
        console.log('prev')
      }}
      next={() => {
        console.log('next')
      }}
    />,
    {
      route,
      ...renderOptions,
    },
  )
  const nextBtn = screen.getByText(/Next/i)

  return {
    ...utils,
    route,
    nextBtn,
    mnemonic,
  }
}

test('Welcome > <SecurityPack />', async () => {
  const {nextBtn, mnemonic} = await renderWelcomeScreen()
  await waitFor(() => {
    expect(clientMock.generateSeed).toBeCalledTimes(1)
  })

  expect(screen.getByText(/word-2/i)).toBeInTheDocument()
  expect(nextBtn).toBeInTheDocument()
  expect(nextBtn).not.toBeDisabled()
  userEvent.click(nextBtn)
  await waitFor(() => {
    expect(clientMock.registerAccount).toHaveBeenCalledTimes(1)
  })

  expect(clientMock.registerAccount).toHaveBeenCalledWith(mnemonicTest)
})
