/** @jsx jsx */

import {Editor} from 'slate'
import {jsx} from '../../../test/jsx'

const input = ((
  <editor>
    <blockList>
      <block>
        <hp>test</hp>
      </block>
    </blockList>
  </editor>
) as any) as Editor

test('BlockList > Block', () => {
  expect(input).toMatchInlineSnapshot(`
    Object {
      "addMark": [Function],
      "apply": [Function],
      "children": Array [
        Object {
          "children": Array [
            Object {
              "children": Array [
                Object {
                  "children": Array [
                    Object {
                      "text": "test",
                    },
                  ],
                  "type": "p",
                },
              ],
              "type": "block",
            },
          ],
          "type": "block_list",
        },
      ],
      "deleteBackward": [Function],
      "deleteForward": [Function],
      "deleteFragment": [Function],
      "getFragment": [Function],
      "insertBreak": [Function],
      "insertFragment": [Function],
      "insertNode": [Function],
      "insertText": [Function],
      "isInline": [Function],
      "isVoid": [Function],
      "marks": null,
      "normalizeNode": [Function],
      "onChange": [Function],
      "operations": Array [],
      "removeMark": [Function],
      "selection": null,
    }
  `)
})
