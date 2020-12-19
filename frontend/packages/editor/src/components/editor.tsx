import React from 'react'
import {Slate, ReactEditor} from 'slate-react'
import {css} from 'emotion'
import {
  EditablePlugins,
  RenderElement,
  SlateDocument,
} from '@udecode/slate-plugins'

interface EditorComponentProps {
  editor: any
  plugins: any[]
  value: any
  onChange: (value: any) => void
  readOnly?: boolean
  renderElement?: RenderElement[]
  theme?: 'theme-light' | 'theme-dark'
  push?: any // TODO: FIXME Types
}

function Editor({
  editor,
  plugins,
  value,
  onChange,
  readOnly = false,
  renderElement = [],
}: EditorComponentProps): JSX.Element {
  return (
    <Slate
      editor={editor}
      value={value}
      onChange={v => {
        onChange(v as SlateDocument)
      }}
    >
      <div
        className={`relative mb-48 -mx-8 ${css`
          word-break: break-word;
        `}`}
      >
        {readOnly ? (
          <EditablePlugins
            style={{}}
            readOnly={true}
            plugins={plugins}
            renderElement={renderElement}
            placeholder={
              readOnly ? 'no content' : 'Start writing your masterpiece...'
            }
            spellCheck
            autoFocus
          />
        ) : (
          <EditablePlugins
            style={{}}
            readOnly={readOnly}
            plugins={plugins}
            renderElement={renderElement}
            placeholder={
              readOnly ? 'no content' : 'Start writing your masterpiece...'
            }
            spellCheck
            autoFocus
            onSelect={() => {
              /**
               * Chrome doesn't scroll at bottom of the page. This fixes that.
               */
              if (!(window as any).chrome) return
              if (editor.selection == null) return
              try {
                /**
                 * Need a try/catch because sometimes you get an error like:
                 *
                 * Error: Cannot resolve a DOM node from Slate node: {"type":"p","children":[{"text":"","by":-1,"at":-1}]}
                 */
                const domPoint = ReactEditor.toDOMPoint(
                  editor,
                  editor.selection.focus,
                )
                const node = domPoint[0]
                if (node == null) return
                const element = node.parentElement
                if (element == null) return
                element.scrollIntoView({behavior: 'smooth', block: 'nearest'})
              } catch (e) {
                /**
                 * Empty catch. Do nothing if there is an error.
                 */
              }
            }}
          />
        )}
      </div>
    </Slate>
  )
}

export function EditorComponent(props) {
  return <Editor {...props} />
}
