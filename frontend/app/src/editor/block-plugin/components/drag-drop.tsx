import * as React from 'react';
import { BlockControls } from './block-controls';
import { useRouteMatch } from 'react-router-dom';
import { isLocalNode } from 'src/constants';
// import { Icons } from 'components/icons';
import { useBlockMenu, useBlockMenuDispatch } from './blockmenu-context';
// import {useReadOnly} from 'slate-react'

export const DragDrop = ({
  element,
  children,
  htmlAttributes,
  ...props
}: any) => {
  const match = useRouteMatch({
    path: [`/p/:slug`, `/admin/p/:slug`],
    strict: true,
  });
  const { blockId } = useBlockMenu();
  const blockDispatch = useBlockMenuDispatch();

  return (
    <li
      // className={`relative ${css`
      //   &:before {
      //     margin-top: 0.25em;
      //     margin-bottom: 0.25em;
      //   }
      //   .list-none > &:before {
      //     opacity: 0;
      //   }
      // `}`}
      {...props}
      {...htmlAttributes}
    >
      <div
        {...props}
        className={`relative`}
        onMouseLeave={() => {
          blockDispatch({ type: 'set_block_id', payload: { blockId: null } });
        }}
        onMouseEnter={() =>
          blockDispatch({
            type: 'set_block_id',
            payload: { blockId: element.id },
          })
        }
      >
        {children}

        {match && isLocalNode && (
          <div
            // className={`absolute m-0 p-0 leading-none transition duration-200 shadow-sm ${css`
            //   top: 2px;
            //   right: -9px;
            // `}`}
            contentEditable={false}
          >
            <BlockControls
              highlightedIndex={blockId}
              index={element.id}
              disclosure={
                <span>
                  {/* // TODO: add icon */}
                  {/* <Icons.MoreHorizontal size={16} /> */}
                  more
                </span>
              }
              element={element}
            />
          </div>
        )}
      </div>
    </li>
  );
};
