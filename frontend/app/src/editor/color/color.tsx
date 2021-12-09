import type {EditorPlugin} from '../types'

export const MARK_COLOR = 'color'

export const createColorPlugin = (): EditorPlugin => ({
  name: MARK_COLOR,
  renderLeaf:
    () =>
    ({attributes, children, leaf}) => {
      if (leaf[MARK_COLOR] && leaf.value) {
        return (
          <span style={{color: leaf[MARK_COLOR]}} {...attributes}>
            {children}
          </span>
        )
      }
    },
  // onDOMBeforeInput: (editor) => (ev) => {
  //   if (ev.inputType == 'formatFontColor' && editor.selection) {
  //     ev.preventDefault()
  //     //@ts-ignore
  //     toggleMark(editor, 'color', ev.data)
  //   }
  // },
})
