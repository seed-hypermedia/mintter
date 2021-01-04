import {useDndBlock} from '@udecode/slate-plugins'
import {mergeRefs} from '../../merge-refs'
import React from 'react'
import {BlockControls} from '../../../components/block-controls'
import {useBlockMenu, useBlockMenuDispatch} from './blockmenu-context'
import {ReactEditor, useEditor} from 'slate-react'

export function DragDrop({element, componentRef, children}: any) {
  const blockRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const multiRef = mergeRefs(componentRef, rootRef)
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const {dropLine, dragRef} = useDndBlock({
    id: element.id,
    blockRef,
  })

  const dragWrapperRef = React.useRef(null)
  const multiDragRef = mergeRefs(dragRef, dragWrapperRef)

  const state = useBlockMenu()
  const dispatch = useBlockMenuDispatch()

  return (
    <div ref={multiRef}>
      <div
        className="relative"
        ref={blockRef}
        onMouseLeave={() => dispatch({type: 'set_block_id', payload: null})}
        onMouseEnter={() =>
          dispatch({type: 'set_block_id', payload: element.id})
        }
      >
        <BlockControls
          element={element}
          path={path}
          show={state.blockId === element.id}
          dragRef={multiDragRef}
        />
        {children}

        {!!dropLine && (
          <div
            className={`h-1 w-full bg-blue-300 absolute`}
            style={{
              top: dropLine === 'top' ? -1 : undefined,
              bottom: dropLine === 'bottom' ? -1 : undefined,
            }}
            contentEditable={false}
          />
        )}
      </div>
    </div>
  )
}
