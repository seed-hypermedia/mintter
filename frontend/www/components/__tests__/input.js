import {axe} from 'jest-axe'
import {render} from '@testing-library/react'
import Input from '../input'

test('<Input />', async () => {
  const {container, getByLabelText} = render(
    <form>
      <label htmlFor="input-demo">demo</label>
      <Input name="input-demo" id="input-demo" />
    </form>,
  )

  const input = getByLabelText(/demo/i)

  expect(input).toMatchInlineSnapshot(`
    <input
      class="block w-full border border-gray-300 rounded bg-white px-3 py-2 focus:outline-none focus:border-gray-600 "
      id="input-demo"
      name="input-demo"
      type="text"
    />
  `)

  const results = await axe(input)
  expect(results).toHaveNoViolations()
})
