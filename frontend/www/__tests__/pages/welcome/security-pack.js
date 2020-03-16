import React from 'react'
import {render, fireEvent, wait} from '@testing-library/react'
import user from '@testing-library/user-event'
import SecurityPack from '../../../pages/welcome/security-pack'
import {axe} from 'jest-axe'
import {RpcProvider} from '../../../shared/rpc'

test('Page => Security Pack', async () => {
  const mockGetMnemonicList = jest.fn(() => ['a', 'b', 'c'])

  const {getByLabelText, getByText, queryByText} = render(
    <RpcProvider
      value={{genSeed: () => ({getMnemonicList: mockGetMnemonicList})}}
    >
      <SecurityPack />
    </RpcProvider>,
  )
  const input = getByLabelText(/Passphrase?/i)
  const results = await axe(input)

  expect(results).toHaveNoViolations()

  const passPhraseButton = getByText(/Generate security pack/i)
  user.type(input, 'hola')
  fireEvent.click(passPhraseButton)

  await wait(() =>
    expect(queryByText(/Generate security pack/i)).not.toBeInTheDocument(),
  )

  expect(mockGetMnemonicList).toHaveBeenCalledTimes(1)

  // check that the mnemonic is not visible

  // check that the passphrase function is being called with the passphrase added (mock)
  // check that when the mnemonic workds are visible, the passphrase input is not
})
