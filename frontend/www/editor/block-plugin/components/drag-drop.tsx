import React from 'react'
import {useRouteMatch} from 'react-router-dom'
import {css} from 'emotion'
import {BlockControls} from 'components/block-controls'
import {Icons} from 'components/icons'
import {useBlockMenu, useBlockMenuDispatch} from './blockmenu-context'
// import {useReadOnly} from 'slate-react'

export const DragDrop = ({
  element,
  children,
  htmlAttributes,
  dispatch,
  ...props
}: any) => {
  const match = useRouteMatch({
    path: [`/p/:slug`, `/admin/p/:slug`],
    strict: true,
  })
  const isLocalhost = React.useMemo(
    () => window?.location?.hostname?.includes('localhost'),
    [],
  )
  const {blockId} = useBlockMenu()
  const blockDispatch = useBlockMenuDispatch()
  return (
    <li
      {...props}
      className={`relative ${css`
        &:before {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .list-none > &:before {
          opacity: 0;
        }
      `}`}
      onMouseLeave={() => {
        blockDispatch({type: 'set_block_id', payload: {blockId: null}})
      }}
      onMouseEnter={() =>
        blockDispatch({
          type: 'set_block_id',
          payload: {blockId: element.id},
        })
      }
      {...htmlAttributes}
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
    </li>
  )
}
