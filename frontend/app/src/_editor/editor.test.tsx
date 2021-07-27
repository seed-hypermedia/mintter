/** @jsx jsx */

import {jsx} from '@udecode/slate-plugins-test-utils'
import type {Editor} from 'slate'

jsx

const input = (
  <editor>
    <hblock id="1">test</hblock>
  </editor>
) as any as Editor

const output = (
  <editor>
    <hblock id="1">test</hblock>
  </editor>
) as any as Editor

describe('default editor', () => {
  it('works!', () => {
    expect(input).toEqual(output)
  })
})
