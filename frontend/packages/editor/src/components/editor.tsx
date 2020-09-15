import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins, SlateDocument} from '@udecode/slate-plugins'
import {Droppable} from 'react-beautiful-dnd'
// import {Toolbar} from './toolbar'
import {HelperToolbar, HelperProvider, useHelper} from '../HelperPlugin'
import {ELEMENT_BLOCK} from '../BlockPlugin'
import {ELEMENT_IMAGE} from '../ImagePlugin'
import {getPreventDefaultHandler} from '../BlockPlugin/utils/getPreventDefaultHandler'

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
        {/* <div className="bg-background py-4">
          <p className="px-4 uppercase text-body-muted text-xs font-bold">
            Actions
          </p>
          <ul>
            <li>
              <button className="w-full px-4 py-1 flex items-center justify-start text-body hover:bg-background-muted bg-background">
                <Icons.Trash size={16} color="currentColor" />
                <span className="text-body text-sm px-2">Delete</span>
              </button>
            </li>
          </ul>
        </div> */}
      </HelperToolbar>
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
