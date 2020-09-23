/** @jsx jsx */
import {jsx} from '../../../../test/jsx'
import {Editor} from 'slate'
import {avoidMultipleChilds} from '../avoidMultipleChilds'

test('avoidMultipleChilds: move top block to main blockList', () => {
  const input = ((
    <editor>
      <block id="block-1">
        <hp>
          <htext>Hello block 1</htext>
        </hp>
      </block>
      <blockList id="blockList-1">
        <block id="block-2">
          <hp>
            <htext>Hello block 2</htext>
          </hp>
        </block>
      </blockList>
    </editor>
  ) as any) as Editor

  const output = ((
    <editor>
      <blockList id="blockList-1">
        <block id="block-1">
          <hp>
            <htext>Hello block 1</htext>
          </hp>
        </block>
        <block id="block-2">
          <hp>
            <htext>Hello block 2</htext>
          </hp>
        </block>
      </blockList>
    </editor>
  ) as any) as Editor

  avoidMultipleChilds(input)

  expect(input.children).toEqual(output.children) // TODO: fix types
})

// test('toBlock: block with image', () => {})
