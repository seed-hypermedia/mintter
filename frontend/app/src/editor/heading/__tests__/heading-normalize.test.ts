import {buildEditorHook, EditorMode} from '../../plugin-utils'
import {plugins} from '../../plugins'

describe('Heading Plugin', () => {
  test('should render text', () => {
    const editor = buildEditorHook(plugins, EditorMode.Draft)
    console.log('editor: ', editor)
  })
})
