import React from 'react'
import {render, waitFor} from '@testing-library/react'
import {Connections} from '../connections'
import {MintterProvider} from 'shared/mintterContext'
import {
  connectToPeerById as mockedConnectToPeerById,
  allConnections as mockedAllConnections,
} from 'shared/mintterClient'

jest.mock('shared/mintterClient')

test('should render the list of connections', async () => {
  mockedConnectToPeerById.mockResolvedValueOnce({})
  mockedAllConnections.mockResolvedValueOnce({
    toObject: () => ({
      profilesList: [
        {
          username: 'horacio',
          accountId: '234567890',
        },
      ],
    }),
  })

  const {debug} = render(
    <MintterProvider>
      <Connections />
    </MintterProvider>,
  )

  await waitFor(() => {
    debug()
  })
})
