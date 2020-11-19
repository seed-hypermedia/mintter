import React from 'react'
import {render, screen} from '@testing-library/react'
import {Connections} from '../connections'

test('<Connections />: renders loading', async () => {
  await render(
    <Connections
      onConnect={() => null}
      isLoading={true}
      connections={[
        {
          connectionStatus: 0,
          username: 'testuser1',
          accountId: 'reallylongaccountidabcd1234',
        },
      ]}
    />,
  )

  screen.getByText(/loading.../i)
})
