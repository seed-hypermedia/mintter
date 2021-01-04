/** @jsx jsx */
import {jsx} from 'test/jsx'
import {Editor} from 'slate'
import {toBlock} from '../transformers'
import {cleanNode} from 'test/hyperscript/clean-node'

test('toBlock: simple text block', () => {
  const inputEditor = ((
    <editor>
      <block id="test-1">
        <hp>
          Hello <htext bold>World!</htext>
        </hp>
      </block>
    </editor>
  ) as any) as Editor

  const input = cleanNode(inputEditor)
  const blockNode = input.children[0]

  expect(toBlock(blockNode as any)).toMatchInlineSnapshot(`
    Object {
      "array": Array [
        "test-1",
        Array [],
        Array [
          Array [
            Array [
              "Hello ",
            ],
            Array [
              "World!",
              Array [
                true,
              ],
            ],
          ],
        ],
      ],
      "arrayIndexOffset_": -1,
      "convertedPrimitiveFields_": Object {},
      "messageId_": undefined,
      "pivot_": 1.7976931348623157e+308,
      "wrappers_": Object {
        "3": Object {
          "array": Array [
            Array [
              Array [
                "Hello ",
              ],
              Array [
                "World!",
                Array [
                  true,
                ],
              ],
            ],
          ],
          "arrayIndexOffset_": -1,
          "convertedPrimitiveFields_": Object {},
          "messageId_": undefined,
          "pivot_": 1.7976931348623157e+308,
          "wrappers_": Object {
            "1": Array [
              Object {
                "array": Array [
                  "Hello ",
                ],
                "arrayIndexOffset_": -1,
                "convertedPrimitiveFields_": Object {},
                "messageId_": undefined,
                "pivot_": 1.7976931348623157e+308,
                "wrappers_": null,
              },
              Object {
                "array": Array [
                  "World!",
                  Array [
                    true,
                  ],
                ],
                "arrayIndexOffset_": -1,
                "convertedPrimitiveFields_": Object {},
                "messageId_": undefined,
                "pivot_": 1.7976931348623157e+308,
                "wrappers_": Object {
                  "2": Object {
                    "array": Array [
                      true,
                    ],
                    "arrayIndexOffset_": -1,
                    "convertedPrimitiveFields_": Object {},
                    "messageId_": undefined,
                    "pivot_": 1.7976931348623157e+308,
                    "wrappers_": null,
                  },
                },
              },
            ],
          },
        },
      },
    }
  `) // TODO: fix types
})

// test('toBlock: block with image', () => {})
