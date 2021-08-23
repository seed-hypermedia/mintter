import type {BaseElement, BaseText, BaseEditor, Editor, NodeEntry, Range} from 'slate'
import type {ReactEditor, RenderElementProps, RenderLeafProps, Editable} from 'slate-react'

interface Element extends BaseElement {
  type: string
}

interface Text extends BaseText {
  [key: string]: unknown
}

declare module 'slate' {
  export interface CustomTypes {
    Editor: BaseEditor & ReactEditor
    Element: Element
    Text: Text
  }
}

export type EditorEventHandlers = {
  [Event in keyof React.DOMAttributes<HTMLTextAreaElement> as Exclude<
    Event,
    'children' | 'dangerouslySetInnerHTML'
  >]?: Parameters<typeof Editable>[0][Event]
}

export interface EditorPlugin extends EditorEventHandlers {
  name: string
  configureEditor?: (editor: Editor) => Editor
  renderElement?: (props: RenderElementProps) => JSX.Element | undefined
  renderLeaf?: (props: RenderLeafProps) => JSX.Element | undefined
  decorate?: (node: NodeEntry) => Range[] | undefined
}
