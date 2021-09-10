import type {MttastContent, Document, Text, Image, Video} from '@mintter/mttast'
import type {BaseEditor, Editor, NodeEntry, Range} from 'slate'
import type {HistoryEditor} from 'slate-history'
import type {ReactEditor, RenderElementProps, RenderLeafProps, Editable} from 'slate-react'

declare module 'slate' {
  export interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor & {mode: string}
    Element: Exclude<MttastContent, Document | Text | Video | Image>
    Text: Text
  }
}

export type EditorEventHandlers = {
  [Event in keyof React.DOMAttributes<HTMLTextAreaElement> as Exclude<
    Event,
    'children' | 'dangerouslySetInnerHTML'
  >]?: Parameters<typeof Editable>[0][Event]
}

interface BeforeInputHandler {
  onDOMBeforeInput?: (event: InputEvent) => void
}

export interface EditorPlugin extends EditorEventHandlers, BeforeInputHandler {
  name: string
  apply?: string | ((mode: string) => boolean)
  configureEditor?: (editor: Editor) => Editor | undefined | void
  renderElement?: (props: RenderElementProps) => JSX.Element | undefined | void
  renderLeaf?: (props: RenderLeafProps) => JSX.Element | undefined | void
  decorate?: (node: NodeEntry) => Range[] | undefined | void
}
