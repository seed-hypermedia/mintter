import {render, fireEvent, waitFor} from '@testing-library/react'
// import user from '@testing-library/user-event'
import SecurityPack from '../../../pages/welcome/security-pack'
import {axe} from 'jest-axe'
import {RpcProvider} from '../../../shared/rpc'

const mockGetMnemonicList = jest.fn(() => ['a', 'b', 'c'])

function Component() {
  return (
    <RpcProvider
      value={{
        genSeed: () => ({getMnemonicList: mockGetMnemonicList}),
      }}
    >
      <SecurityPack />
    </RpcProvider>
  )
}

describe('<SecurityPack />', () => {
  test('should Passphrase input be optional', () => {
    const {getByLabelText} = render(<Component />)
    // passphrase input
    const input = getByLabelText(/Passphrase?/i)

    // passphrase should not be required
    expect(input).not.toBeRequired()
  })

  test('should Passphrase input be accessible (AXE check)', async () => {
    const {getByLabelText} = render(<Component />)
    // passphrase input
    const input = getByLabelText(/Passphrase?/i)
    const results = await axe(input)

    // check accesibility errors
    expect(results).toHaveNoViolations()
  })

  test('should <NextButton /> be disabled by default', () => {
    const {getByText} = render(<Component />)

    const nextButton = getByText(/Next →/i)
    expect(nextButton).toBeDisabled()
  })

  test('should generate the mnemonic words, show them and enable the Next button', async () => {
    const {getByText, queryByText, getByTestId} = render(<Component />)

    const passPhraseButton = getByText(/Generate security pack/i)

    fireEvent.click(passPhraseButton)

    await waitFor(() =>
      // check the passphrase input is not visible
      expect(queryByText(/Generate security pack/i)).not.toBeInTheDocument(),
    )
    // check that the mnemonic is not visible
    expect(mockGetMnemonicList).toHaveBeenCalledTimes(1)

    // mnemonic workds are visible
    const mnemonicList = getByTestId('mnemonic-list')
    expect(mnemonicList).toBeVisible()

    const nextButton = getByText(/Next →/i)
    // next button is NOT disabled === mnemonic words are generated
    expect(nextButton).not.toBeDisabled()
  })
})
