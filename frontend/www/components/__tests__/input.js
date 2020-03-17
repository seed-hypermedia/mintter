import {axe} from 'jest-axe'
import {render} from '@testing-library/react'
import Input from '../input'

test('<Input />', async () => {
  const {getByLabelText, debug} = render(
    <form>
      <label htmlFor="input-demo">demo</label>
      <Input name="input-demo" id="input-demo" />
    </form>,
  )

  const input = getByLabelText(/demo/i)

  const results = await axe(input)
  expect(results).toHaveNoViolations()
})
