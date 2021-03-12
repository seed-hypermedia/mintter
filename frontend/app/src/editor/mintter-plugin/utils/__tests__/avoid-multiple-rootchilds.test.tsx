/** @jsx jsx */
import { jsx } from 'test/jsx';
import type { Editor } from 'slate';
import { cleanNode } from 'test/hyperscript/clean-node';
import { avoidMultipleRootChilds } from '../avoid-multiple-rootchilds';

test('avoidMultipleRootChilds: move top block to main blockList', () => {
  const inputEditor = ((
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
  ) as any) as Editor;

  const outputEditor = ((
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
  ) as any) as Editor;

  const input = cleanNode(inputEditor);
  const output = cleanNode(outputEditor);
  avoidMultipleRootChilds(input);
  expect(input.children).toEqual(output.children);
});

// test('toBlock: block with image', () => {})
