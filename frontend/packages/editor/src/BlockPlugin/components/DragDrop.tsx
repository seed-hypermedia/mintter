import React from 'react'
import {css} from 'emotion'
import {BlockControls} from '../../components/blockControls'
import {useBlockMenu} from './blockMenuContext'
import {mergeRefs} from '../../mergeRefs'
import {Icons} from '../../components/icons'
import {useReadOnly} from 'slate-react'

export const DragDrop = ({element, children, componentRef, ...props}: any) => {
  const ref = mergeRefs(props.ref, componentRef)
  const {
    dispatch,
    state: {blockId},
  } = useBlockMenu()
  const readonly = useReadOnly()

  let show = React.useMemo(() => blockId === element.id, [blockId, element.id])
  return (
    <div {...props} ref={ref}>
      <div
        className="relative mt-6"
        // onMouseLeave={() => {
        //   dispatch({type: 'set_block_id', payload: {blockId: null}})
        // }}
        onMouseEnter={() =>
          dispatch({type: 'set_block_id', payload: {blockId: element.id}})
        }
      >
        {children}

        {readonly && (
          <div
            className={`absolute m-0 p-0 leading-none transition duration-200 ${css`
              top: 2px;
              right: ${element.type === 'transclusion' ? '-5px' : '-9px'};
            `} ${show ? 'opacity-100' : 'opacity-100'}`}
            contentEditable={false}
          >
            <BlockControls
              disclosure={
                <span className="block m-0 p-0">
                  <Icons.MoreHorizontal size={16} />
                </span>
              }
              element={element}
            />
          </div>
        )}
      </div>
    </div>
  )
}
