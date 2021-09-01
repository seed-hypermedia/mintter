import {createGroupPlugin} from '../group'
import {buildEditor, DEFAULT_MODE} from '../../plugin-utils'
import {group, text} from '@mintter/mttast-builder'

describe('Group', () => {
  describe('normalization', () => {
    it('removes empty groups', () => {
      //@ts-expect-error
      const input = group([text('')])

      const editor = buildEditor([createGroupPlugin()], DEFAULT_MODE)
      editor.children = [input]
      editor.normalizeNode([input, [0]])

      expect(editor.children).to.deep.equal([])
    })
  })
})
