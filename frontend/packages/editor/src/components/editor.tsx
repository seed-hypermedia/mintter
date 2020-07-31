import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins, SlateDocument} from '@udecode/slate-plugins'
import {DragDropContext, Droppable} from 'react-beautiful-dnd'
import {Toolbar} from './toolbar'
import {HelperToolbar, useHelper} from '../HelperPlugin'
import {ELEMENT_BLOCK, ELEMENT_IMAGE} from '../elements'
import {reorderBlocks} from '../BlockPlugin'

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
  } = useHelper(HELPER_OPTIONS, {trigger: '/'})

  function onDragEnd(result) {
    if (!result.destination) {
      return
    }

    reorderBlocks(editor, result)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Slate
        editor={editor}
        value={value}
        onChange={v => {
          onChange(v as SlateDocument)
          onChangeHelper(editor)
        }}
      >
        <div
          className={`-mx-8 ${css`
            word-break: break-word;
          `}`}
        >
          <div className="relative" ref={ref}>
            <Toolbar />
            <Droppable droppableId="editor">
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
            <HelperToolbar
              at={target}
              valueIndex={index}
              options={values}
              onClickSelection={onAddBlock}
              setValueIndex={setValueIndex}
              theme={theme}
            />
          </div>
        </div>
      </Slate>
    </DragDropContext>
  )
}

export const EditorComponent = React.forwardRef(Editor)
