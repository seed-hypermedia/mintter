import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins, SlateDocument} from '@udecode/slate-plugins'
import {Toolbar} from './toolbar'
import {HelperToolbar, useHelper} from '../HelperPlugin'
import {ELEMENT_BLOCK, ELEMENT_IMAGE} from '../elements'

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
        className={`-mx-8 ${css`
          word-break: break-word;
        `}`}
      >
        <div className="relative" ref={ref}>
          <Toolbar />
          {/* {!isEmpty() && <SectionToolbar />} */}
          <EditablePlugins
            readOnly={readOnly}
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
  )
}

export const EditorComponent = React.forwardRef(Editor)
