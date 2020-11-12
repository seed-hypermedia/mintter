import React from 'react'
import {css} from 'emotion'
import {BlockControls} from '../../components/blockControls'
import {useBlockMenu} from './blockMenuContext'
import {mergeRefs} from '../../mergeRefs'
import {useReadOnly} from 'slate-react'

export function DragDrop({element, children, componentRef, ...props}: any) {
  const ref = mergeRefs(props.ref, componentRef)
  const {
    dispatch,
    state: {blockId},
  } = useBlockMenu()
  const readOnly = useReadOnly()
  console.log('DragDrop -> readOnly', readOnly)

  let show = React.useMemo(() => blockId === element.id, [blockId, element.id])
  return (
    <div {...props} ref={ref}>
      <div
        className="relative"
        onMouseLeave={() => {
          dispatch({type: 'set_block_id', payload: {blockId: null}})
        }}
        onMouseEnter={() =>
          dispatch({type: 'set_block_id', payload: {blockId: element.id}})
        }
      >
        {children}
        {readOnly && (
          <div
            className={`absolute m-0 p-0 leading-none transition duration-200 ${css`
              top: 2px;
              right: ${element.type === 'transclusion' ? '-5px' : '-9px'};
            `} ${show ? 'opacity-100' : 'opacity-0'}`}
            contentEditable={false}
          >
            <BlockControls show={show} element={element} />
          </div>
        )}
      </div>
    </div>
  )
}
