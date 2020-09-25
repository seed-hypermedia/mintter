/** @jsx jsx */
import {jsx} from '../../../test/jsx'
import {Editor} from 'slate'

test('Hierarchy: move block content to the tops nearest block available', () => {
  const input = ((
    <editor>
      <blockList id="blockList-root">
        <block id="block-1">
          <hp>Content block 1</hp>
          <blockList id="blockList-1-1">
            <block id="block-1-1">
              <hp>Content block 1-1</hp>
            </block>
          </blockList>
        </block>
        <block id="block-2">
          <hp>
            <cursor />
            Content block 2
          </hp>
        </block>
      </blockList>
    </editor>
  ) as any) as Editor

  const output = ((
    <editor>
      <blockList id="blockList-root">
        <block id="block-1">
          <hp>Content block 1</hp>
          <blockList id="blockList-1-1">
            <block id="block-1-1">
              <hp>
                Content block 1-1
                <cursor />
                Content block 2
              </hp>
            </block>
          </blockList>
        </block>
      </blockList>
    </editor>
  ) as any) as Editor

  console.log({input, output})

  //   expect(input.children).toEqual(output.children)
})

// test('toBlock: block with image', () => {})
