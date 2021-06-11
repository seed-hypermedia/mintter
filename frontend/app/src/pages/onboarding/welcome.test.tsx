import {Welcome} from './welcome'
import {screen, render} from '@testing-library/react'
import {AppProviders} from '../../app-providers'

it('<Welcome />', async () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  render(
    <AppProviders>
      <Welcome
        next={() => {
          console.log('next!')
        }}
        prev={() => {
          console.log('prev!')
        }}
      />
    </AppProviders>,
  )

  screen.getByText(/Welcome to Mintter/i)
  screen.getByTestId(/next-button/i)
})
