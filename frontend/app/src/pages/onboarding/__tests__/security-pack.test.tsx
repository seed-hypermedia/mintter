import {render, screen, waitFor, userEvent} from '../../../test/app-test-utils'
import {OnboardingPage} from '../index'
import * as clientMock from '@mintter/client'

jest.mock('@mintter/client')

beforeEach(() => {
  ;(clientMock.generateSeed as jest.Mock).mockResolvedValue({mnemonic: ['word-1', 'word-2', 'word-3']})
})

afterEach(() => {
  jest.clearAllMocks()
})

async function renderSecurityPack() {
  return await render(<OnboardingPage machine={{initial: 'securityPack'}} />, {wait: false})
}

describe('<SecurityPack />', () => {
  test('render properly', async () => {
    await renderSecurityPack()
    await waitFor(() => {
      expect(screen.queryByText('word-2')).toBeVisible()
    })
  })

  test('should call registerAccount with the mnemonic words', async () => {
    await renderSecurityPack()

    const button = screen.getByText(/next/i)
    userEvent.click(button)
    await waitFor(() => {
      expect(clientMock.registerAccount).toHaveBeenCalled()
      expect(clientMock.registerAccount).toHaveBeenCalledWith(['word-1', 'word-2', 'word-3'])
    })

    expect(screen.getByText(/Profile Information/i)).toBeInTheDocument()
  })
})
