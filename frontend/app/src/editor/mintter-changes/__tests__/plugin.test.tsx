/** @jsx jsx */
import {jsx} from '@app/test/jsx'
import {afterEach, describe, it} from 'vitest'

describe('Mark blocks as dirty', () => {
  afterEach(() => {})
  it('jsx demo', () => {
    let editor = (
      <editor>
        <group>
          <statement id="block">
            <paragraph>
              <text>demo</text>
            </paragraph>
          </statement>
        </group>
      </editor>
    )
  })
})
