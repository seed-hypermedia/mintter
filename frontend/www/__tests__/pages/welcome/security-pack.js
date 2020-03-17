import {render, fireEvent, wait, queryByTestId} from '@testing-library/react'
// import user from '@testing-library/user-event'
import SecurityPack from '../../../pages/welcome/security-pack'
import {axe} from 'jest-axe'
import {RpcProvider} from '../../../shared/rpc'

test('Page => Security Pack', async () => {
  // RPC provider mock
  const mockGetMnemonicList = jest.fn(() => ['a', 'b', 'c'])

  const {getByLabelText, getByText, queryByText, debug} = render(
    <RpcProvider
      value={{genSeed: () => ({getMnemonicList: mockGetMnemonicList})}}
    >
      <SecurityPack />
    </RpcProvider>,
  )
  // passphrase input
  const input = getByLabelText(/Passphrase?/i)

  // passphrase should not be required
  expect(input).not.toBeRequired()
  const results = await axe(input)

  // check accesibility errors
  expect(results).toHaveNoViolations()

  // check that the passphrase function is being called with the passphrase added (mock)
  // user.type(input, 'hola')
  // How do I mock a new constructor Object

  const passPhraseButton = getByText(/Generate security pack/i)
  const nextButton = getByText(/Next →/i)

  fireEvent.click(passPhraseButton)

  await wait(() =>
    // check the passphrase input is not visible
    expect(queryByText(/Generate security pack/i)).not.toBeInTheDocument(),
  )

  // check that the mnemonic is not visible
  expect(mockGetMnemonicList).toHaveBeenCalledTimes(1)

  // next button is NOT disabled === mnemonic words are generated
  expect(nextButton).not.toBeDisabled()
})
