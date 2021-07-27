import {createEditor, NodeEntry, Range} from 'slate'
import {DefaultElement, DefaultLeaf, RenderElementProps, RenderLeafProps, withReact} from 'slate-react'
import {SlatePlugin} from './types'

export type MTTEditor = BaseEditor & ReactEditor

export const buildEditor = (plugins: SlatePlugin[]): MTTEditor => {
  return plugins
    .flatMap(({configureEditor}) => configureEditor || [])
    .reduce((editor, configure) => configure(editor) || editor, withReact(createEditor()))
}

export const buildRenderElement = (plugins: SlatePlugin[]) => (props: RenderElementProps) => {
  for (const {renderElement} of plugins) {
    const element = renderElement && renderElement(props)
    if (element) return element
  }
  return <DefaultElement {...props} />
}

export const buildRenderLeaf = (plugins: SlatePlugin[]) => (props: RenderLeafProps) => {
  const leafProps = {...props}

  for (const {renderLeaf} of plugins) {
    const newChildren = renderLeaf && renderLeaf(leafProps)
    if (newChildren) leafProps.children = newChildren
  }

  return <DefaultLeaf {...leafProps} />
}

export const buildDecorate = (plugins: SlatePlugin[]) => (entry: NodeEntry) => {
  let ranges: Range[] = []

  for (const {decorate} of plugins) {
    if (!decorate) continue
    ranges = [...ranges, ...(decorate(entry) || [])]
  }

  return ranges
}
