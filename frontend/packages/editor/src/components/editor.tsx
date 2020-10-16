import React from 'react'
import {Slate, ReactEditor} from 'slate-react'
import {css} from 'emotion'
import {
  EditablePlugins,
  RenderElement,
  SlateDocument,
} from '@udecode/slate-plugins'
// import {Toolbar} from './toolbar'
import {HelperToolbar, HelperProvider, useHelper} from '../HelperPlugin'
import {BlockToolsProvider, ELEMENT_BLOCK} from '../BlockPlugin'
import {ELEMENT_IMAGE} from '../ImagePlugin'
import {getPreventDefaultHandler} from '../BlockPlugin/utils/getPreventDefaultHandler'
import {useTransclusionHelper} from '../TransclusionPlugin/TransclusionHelperContext'
import {DndProvider} from 'react-dnd'
import {HTML5Backend} from 'react-dnd-html5-backend'

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

const HELPER_OPTIONS = [
  {
    name: 'Text block',
    type: ELEMENT_BLOCK,
  },
  {
    name: 'Image Block',
    type: ELEMENT_IMAGE,
  },
]

function Editor(
  {
    editor,
    plugins,
    value,
    onChange,
    readOnly = false,
    renderElement = [],
    theme = 'theme-light',
  }: EditorComponentProps,
  ref,
): JSX.Element {
  const {
    target,
    values,
    index,
    onAddBlock,
    onKeyDownHelper,
    onChangeHelper,
    setValueIndex,
  } = useHelper()

  const {
    values: drafts,
    target: tTarget,
    index: tIndex,
    onTranscludeBlock,
    onKeyDownHelper: tKeyDownHelper,
    setValueIndex: tValueIndex,
  } = useTransclusionHelper()

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={v => {
        onChange(v as SlateDocument)
        onChangeHelper(editor)
      }}
    >
      <div
        ref={ref}
        className={`relative -mx-4 ${css`
          word-break: break-word;
        `}`}
      >
        {readOnly ? (
          <>
            <EditablePlugins
              readOnly={true}
              plugins={plugins}
              renderElement={renderElement}
              placeholder={
                readOnly ? 'no content' : 'Start writing your masterpiece...'
              }
              spellCheck
              autoFocus
              onKeyDown={[tKeyDownHelper]}
              onKeyDownDeps={[tIndex, tTarget]}
            />
            <HelperToolbar at={tTarget} options={drafts} theme={theme}>
              <ul>
                {drafts.map((doc, i) => (
                  <li key={`${i}${doc.version}`}>
                    <button
                      className={`block text-left text-body w-full px-4 py-2 ${
                        i === tIndex ? 'bg-background-muted' : 'bg-background'
                      }`}
                      onMouseEnter={() => tValueIndex(i)}
                      onMouseDown={getPreventDefaultHandler(
                        onTranscludeBlock,
                        doc,
                      )}
                    >
                      {doc.title || 'Untitled Document'}
                    </button>
                  </li>
                ))}
              </ul>
            </HelperToolbar>
          </>
        ) : (
          <>
            <EditablePlugins
              readOnly={readOnly}
              plugins={plugins}
              renderElement={renderElement}
              placeholder={
                readOnly ? 'no content' : 'Start writing your masterpiece...'
              }
              spellCheck
              autoFocus
              onKeyDown={[onKeyDownHelper]}
              onKeyDownDeps={[index, target]}
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
            <HelperToolbar at={target} options={values} theme={theme}>
              <ul>
                {values.map((option, i) => (
                  <li key={`${i}${option.type}`}>
                    <button
                      className={`block text-left text-body w-full px-4 py-2 ${
                        i === index ? 'bg-background-muted' : 'bg-background'
                      }`}
                      onMouseEnter={() => setValueIndex(i)}
                      onMouseDown={getPreventDefaultHandler(
                        onAddBlock,
                        editor,
                        option,
                      )}
                    >
                      {option.name}
                    </button>
                  </li>
                ))}
              </ul>
            </HelperToolbar>
          </>
        )}
      </div>
    </Slate>
  )
}

export const EditorChildren = React.forwardRef(Editor)

export function EditorComponent(props) {
  return (
    <DndProvider backend={HTML5Backend}>
      <HelperProvider options={HELPER_OPTIONS}>
        <BlockToolsProvider>
          <EditorChildren {...props} />
        </BlockToolsProvider>
      </HelperProvider>
    </DndProvider>
  )
}
