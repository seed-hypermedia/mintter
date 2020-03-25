import React from 'react'
import {render} from '@testing-library/react'
import DocumentStatus from '../documentStatus'

test('renders', () => {
  const {container} = render(<DocumentStatus />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    .emotion-0 {
      width: 20px;
      height: 20px;
    }

    <div
      class="flex items-start items-center py-2"
    >
      <div
        class="bg-muted rounded-full mr-1 emotion-0"
      />
      <p
        class="text-sm text-muted-hover"
      >
        <span
          class="font-bold"
        >
          Status: 
        </span>
        <span
          class="italic font-light"
        >
          Private
        </span>
      </p>
    </div>
  `)
})
