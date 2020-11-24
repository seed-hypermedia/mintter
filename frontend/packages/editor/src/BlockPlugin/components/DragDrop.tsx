import React from 'react'
import {useRouteMatch} from 'react-router-dom'
import {css} from 'emotion'
import {BlockControls} from '../../components/blockControls'
import {mergeRefs} from '../../mergeRefs'
import {Icons} from '../../components/icons'
import {useBlockMenu} from './blockMenuContext'
// import {useReadOnly} from 'slate-react'

export const DragDrop = ({element, children, componentRef, ...props}: any) => {
  const ref = mergeRefs(props.ref, componentRef)
  const match = useRouteMatch({
    path: '/p/:slug',
    strict: true,
  })

  const {
    dispatch,
    state: {blockId},
  } = useBlockMenu()

  return (
    <div {...props} ref={ref}>
      <div
        className="relative mt-4"
        onMouseLeave={() => {
          dispatch({type: 'set_block_id', payload: {blockId: null}})
        }}
        onMouseEnter={() =>
          dispatch({type: 'set_block_id', payload: {blockId: element.id}})
        }
      >
        {children}

        {match && (
          <div
            className={`absolute m-0 p-0 leading-none transition duration-200 shadow-sm ${css`
              top: 2px;
              right: -9px;
            `}`}
            contentEditable={false}
          >
            <BlockControls
              highlightedIndex={blockId}
              index={element.id}
              disclosure={
                <span>
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
