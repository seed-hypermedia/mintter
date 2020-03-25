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
      class="block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body false "
      id="input-demo"
      name="input-demo"
      type="text"
    />
  `)

  const results = await axe(input)
  expect(results).toHaveNoViolations()
})
