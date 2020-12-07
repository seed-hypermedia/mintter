/** @jsx jsx */
import {jsx} from '../../test/jsx'
import {Editor} from 'slate'
import {orphanTextNodesToBlock} from '../useEditor'
import {createPlugins} from '../plugins'
import {options} from '../options'
import {deserializeHTMLToDocumentFragment} from '@udecode/slate-plugins'

test('should wrap texts with paragraphs', () => {
  const plugins = createPlugins(options)
  const input = deserializeHTMLToDocumentFragment({
    plugins,
    element: `<h1>heading 1</h1><h2>heading 2</h2><h3>heading 3</h3><p>paragraph</p><ul><li>unordered list item</li></ul><ol><li>ordered list item</li></ol><blockquote>blockquote</blockquote><a href="https://mintter.com">link</a>`,
  })

  const output = ((
    <editor>
      <hp>
        <htext>heading 1</htext>
      </hp>
      <hp>
        <htext>heading 2</htext>
      </hp>
      <hp>
        <htext>heading 3</htext>
      </hp>
      <hp>
        <htext>paragraph</htext>
      </hp>
      <hp>
        <htext>unordered list item</htext>
      </hp>
      <hp>
        <htext>ordered list item</htext>
      </hp>
      <hp>
        <htext>blockquote</htext>
      </hp>
      <hp>
        <htext>link</htext>
      </hp>
    </editor>
  ) as any) as Editor

  expect(input.map(orphanTextNodesToBlock())).toEqual(output.children)
})
