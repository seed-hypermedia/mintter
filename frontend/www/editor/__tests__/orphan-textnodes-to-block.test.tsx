/** @jsx jsx */
import {jsx} from 'test/jsx'
import {waitFor} from 'test/app-test-utils'
import {cleanNode} from 'test/hyperscript/clean-node'
import {Editor} from 'slate'
import {createPlugins} from '../plugins'
import {options} from '../options'
import {renderHook, act} from '@testing-library/react-hooks'
import {useEditor} from 'shared/use-editor'
import {ReactEditor} from 'slate-react'

class DataTransfer {
  constructor() {
    this.data = {dragX: '', dragY: ''}
    this.dropEffect = 'none'
    this.effectAllowed = 'all'
    this.files = []
    this.img = ''
    this.items = []
    this.types = []
    this.xOffset = 0
    this.yOffset = 0
  }
  clearData() {
    this.data = {}
  }
  getData(format) {
    return this.data[format]
  }
  setData(format, data) {
    this.data[format] = data
  }
  setDragImage(img, xOffset, yOffset) {
    this.img = img
    this.xOffset = xOffset
    this.yOffset = yOffset
  }
}

// TODO: This test does not pass since the insertData method is not changing the editor and I cannot compare the result with the mocked value.

xtest('should wrap texts with paragraphs', () => {
  const plugins = createPlugins(options)
  const {result} = renderHook(() => useEditor(plugins, options) as ReactEditor)

  const data = new DataTransfer()

  data.setData(
    'text/html',
    `<h1>heading 1</h1><h2>heading 2</h2><h3>heading 3</h3><p>unordered list</p><ul><li>unordered list item</li></ul><p>ordered list</p><ol><li>ordered list item</li></ol><blockquote>blockquote</blockquote><a href="https://mintter.com">link</a>`,
  )

  act(() => {
    result.current.insertData(data)
  })

  waitFor(() => {
    console.log('result => ', result.current.children)
  })

  // console.log(
  //   '🚀 ~ file: orphan-textnodes-to-block.test.tsx ~ line 15 ~ test ~ input',
  //   input,
  // )

  const output = ((
    <editor>
      <block id="block-1">
        <hp>
          <htext>heading 1</htext>
        </hp>
      </block>
      <block id="block-2">
        <hp>
          <htext>heading 2</htext>
        </hp>
      </block>
      <block id="block-3">
        <hp>
          <htext>heading 3</htext>
        </hp>
      </block>
      <block id="block-4">
        <hp>
          <htext>unordered list</htext>
        </hp>
        <blockList>
          <hp>
            <htext>unordered list item</htext>
          </hp>
        </blockList>
      </block>
      <block id="block-5">
        <hp>
          <htext>ordered list</htext>
        </hp>
        <blockList>
          <hp>
            <htext>ordered list item</htext>
          </hp>
        </blockList>
      </block>
      <block id="block-6">
        <hp>
          <htext>blockquote</htext>
        </hp>
      </block>
      <block id="block-6">
        <hp>
          <htext underline={true}>link</htext>
        </hp>
      </block>
    </editor>
  ) as any) as Editor

  // const mock = output.children.map(cleanNode)
  // expect(result.current.children).toEqual(mock)
})
