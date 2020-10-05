/** @jsx jsx */
import {jsx} from '../../../../test/jsx'
import {Editor} from 'slate'
import {avoidMultipleBlockChilds} from '../avoidMultipleBlockChilds'

test('avoidMultipleBlockChilds', () => {
  const input = ((
    <editor>
      <blockList id="blockList-1">
        <block id="block-1">
          <hp>
            <htext>Paragraph 1</htext>
          </hp>
          <hp>
            <htext>Paragraph 2</htext>
          </hp>
          <hp>
            <htext>Paragraph 3</htext>
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
            <htext>Paragraph 1</htext>
          </hp>
        </block>
        <block id="block">
          <hp>
            <htext>Paragraph 2</htext>
          </hp>
        </block>
        <block id="block">
          <hp>
            <htext>Paragraph 3</htext>
          </hp>
        </block>
      </blockList>
    </editor>
  ) as any) as Editor

  avoidMultipleBlockChilds(input)

  expect(input.children).toEqual(output.children) // TODO: fix types
})

// test('toBlock: block with image', () => {})
