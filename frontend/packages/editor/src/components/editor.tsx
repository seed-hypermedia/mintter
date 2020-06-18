import React from 'react'
import {Slate} from 'slate-react'
import {css} from 'emotion'
import {EditablePlugins} from 'slate-plugins-next'
import {renderElements as renderDefaultElements} from '../renderElements'
import {Toolbar} from './toolbar'
import {renderLeafs as renderDefaultLeafs} from '../renderLeafs'

function Editor(
  {
    editor,
    plugins,
    value,
    onChange,
    readOnly = false,
    renderElements = [],
    renderLeafs = [],
  },
  ref,
): JSX.Element {
  // function isEmpty(): boolean {
  //   return sections
  //     ? sections.length === 1 && Node.string(sections[0]) === ''
  //     : false
  // }

  return (
    <Slate editor={editor} value={value} onChange={onChange}>
      <div
        className={`${css`
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
            renderLeaf={[...renderDefaultLeafs, ...renderLeafs]}
            placeholder="Start writing your masterpiece..."
            spellCheck
            autoFocus
          />
        </div>
      </div>
    </Slate>
  )
}

export const EditorComponent = React.forwardRef(Editor)
