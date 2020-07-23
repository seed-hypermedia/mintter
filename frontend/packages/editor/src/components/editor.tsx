import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins} from '@udecode/slate-plugins'
import {renderElements as renderDefaultElements} from '../renderElements'
import {Toolbar} from './toolbar'
import {HelperToolbar, useHelper} from '../HelperPlugin'

interface EditorComponentProps {
  editor: any
  plugins: any[]
  value: any
  onChange: (value: any) => void
  readOnly?: boolean
  renderElements?: any[]
}

function Editor(
  {
    editor,
    plugins,
    value,
    onChange,
    readOnly = false,
    renderElements = [],
  }: EditorComponentProps,
  ref,
): JSX.Element {
  // function isEmpty(): boolean {
  //   return sections
  //     ? sections.length === 1 && Node.string(sections[0]) === ''
  //     : false
  // }

  const {target, options, index, onAddBlock, onKeyDownHelper} = useHelper()

  return (
    <Slate editor={editor} value={value} onChange={onChange}>
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
            renderElement={[...renderDefaultElements, ...renderElements]}
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
            options={options}
            onClickSelection={onAddBlock}
          />
        </div>
      </div>
    </Slate>
  )
}

export const EditorComponent = React.forwardRef(Editor)
