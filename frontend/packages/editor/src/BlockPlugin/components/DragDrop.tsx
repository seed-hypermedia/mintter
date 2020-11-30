import React from 'react'
import {useRouteMatch} from 'react-router-dom'
import {css} from 'emotion'
import {BlockControls} from '../../components/blockControls'
import {mergeRefs} from '../../mergeRefs'
import {Icons} from '../../components/icons'
import {useBlockMenu, useBlockMenuDispatch} from './blockMenuContext'
// import {useReadOnly} from 'slate-react'

export const DragDrop = ({element, children, componentRef, ...props}: any) => {
  const ref = mergeRefs(props.ref, componentRef)
  const match = useRouteMatch({
    path: [`/p/:slug`, `/admin/p/:slug`],
    strict: true,
  })
  const isLocalhost = React.useMemo(
    () => window?.location?.hostname?.includes('localhost'),
    [],
  )
  const {blockId} = useBlockMenu()
  const dispatch = useBlockMenuDispatch()

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

        {match && isLocalhost && (
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
