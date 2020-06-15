import React from 'react'
import {render} from '@testing-library/react'
import {Connections} from '../connections'
import {AppProviders} from '../app-providers'

test('should render the list of connections', () => {
  const {debug} = render(
    <AppProviders>
      <Connections />
    </AppProviders>,
  )
  debug()
})
