import React from 'react'
import {render, screen, userEvent, act} from 'test/app-test-utils'
import {Connections} from '../connections'
import * as clientMock from 'shared/V1mintterClient'
import {ListProfilesResponse} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/V1mintterClient')

beforeEach(() => {
  clientMock.listConnections.mockResolvedValueOnce({
    toObject: (): ListProfilesResponse.AsObject => ({
      profilesList: [
        {
          connectionStatus: 0,
          username: 'testuser1',
          accountId: 'reallylongaccountidabcd1234',
        },
      ],
    }),
  })
})
test('<Connections />: renders the users', async () => {
  await render(<Connections />)

  screen.getByText(/connections/i)
  screen.getByText(/testuser1/i)
})
