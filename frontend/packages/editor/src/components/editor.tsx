import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins, SlateDocument} from '@udecode/slate-plugins'
import {Droppable} from 'react-beautiful-dnd'
// import {Toolbar} from './toolbar'
import {HelperToolbar, HelperProvider, useHelper} from '../HelperPlugin'
import {ELEMENT_BLOCK} from '../BlockPlugin'
import {ELEMENT_IMAGE} from '../ImagePlugin'

interface EditorComponentProps {
  editor: any
  plugins: any[]
  value: any
  onChange: (value: any) => void
  readOnly?: boolean
  renderElements?: any[]
  theme?: 'theme-light' | 'theme-dark'
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
    renderElements = [],
    theme = 'theme-light',
  }: EditorComponentProps,
  ref,
): JSX.Element {
  // function isEmpty(): boolean {
  //   return sections
  //     ? sections.length === 1 && Node.string(sections[0]) === ''
  //     : false
  // }

  const {
    target,
    values,
    index,
    onAddBlock,
    onKeyDownHelper,
    onChangeHelper,
    setValueIndex,
  } = useHelper()

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
          <EditablePlugins
            readOnly={true}
            plugins={plugins}
            renderElement={renderElements}
            placeholder={
              readOnly ? 'no content' : 'Start writing your masterpiece...'
            }
            spellCheck
            autoFocus
            onKeyDown={[onKeyDownHelper]}
            onKeyDownDeps={[index, target]}
          />
        ) : (
          <Droppable droppableId="editor" type="block_list">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <EditablePlugins
                  readOnly={readOnly && !snapshot.isDraggingOver}
                  plugins={plugins}
                  renderElement={renderElements}
                  placeholder={
                    readOnly
                      ? 'no content'
                      : 'Start writing your masterpiece...'
                  }
                  spellCheck
                  autoFocus
                  onKeyDown={[onKeyDownHelper]}
                  onKeyDownDeps={[index, target]}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
      <HelperToolbar
        at={target}
        valueIndex={index}
        options={values}
        onClickSelection={onAddBlock}
        setValueIndex={setValueIndex}
        theme={theme}
      />
    </Slate>
  )
}

export const EditorChildren = React.forwardRef(Editor)

export function EditorComponent(props) {
  return (
    <HelperProvider options={HELPER_OPTIONS}>
      <EditorChildren {...props} />
    </HelperProvider>
  )
}
