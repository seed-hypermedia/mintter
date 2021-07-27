import {JSX} from 'preact'
import {BaseEditor, BaseElement, BaseText, Editor, NodeEntry, Range} from 'slate'
import {ReactEditor, RenderElementProps, RenderLeafProps} from 'slate-react'

interface Element extends BaseElement {
  [key: string]: any
  type: string
}

interface Text extends BaseText {
  [key: string]: any
}

declare module 'slate' {
  export interface CustomTypes {
    Editor: BaseEditor & ReactEditor
    Element: Element
    Text: Text
  }
}

export interface SlatePlugin {
  key: string
  configureEditor?: (editor: Editor) => Editor | undefined
  renderElement?: (props: RenderElementProps) => JSX.Element | undefined
  renderLeaf?: (props: RenderLeafProps) => JSX.Element | undefined
  decorate?: (entry: NodeEntry) => Range[] | undefined
}
