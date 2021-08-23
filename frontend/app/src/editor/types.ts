import type {MttastContent, Document, Text} from '@mintter/mttast'
import type {BaseEditor, Editor, NodeEntry, Range} from 'slate'
import type {HistoryEditor} from 'slate-history'
import type {ReactEditor, RenderElementProps, RenderLeafProps, Editable} from 'slate-react'

declare module 'slate' {
  export interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: Document | Exclude<MttastContent, Text>
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
  mode?: string
  configureEditor?: (editor: Editor) => Editor | undefined | void
  renderElement?: (props: RenderElementProps) => JSX.Element | undefined | void
  renderLeaf?: (props: RenderLeafProps) => JSX.Element | undefined | void
  decorate?: (node: NodeEntry) => Range[] | undefined | void
}
