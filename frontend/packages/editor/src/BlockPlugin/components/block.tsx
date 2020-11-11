import React from 'react'
import {DragDrop} from './DragDrop'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'

export function BlockBase(
  {attributes, element, className = '', children, ...rest},
  ref,
) {
  let quoters = element.quotersList?.length
  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div className={`relative ${className}`}>
        {quoters !== 0 && (
          <div
            contentEditable={false}
            style={{userSelect: 'none'}}
            className={`hidden md:block absolute ${css`
              9top: -2px;
              right: -14px;
            `}`}
          >
            <Tippy
              content={
                <span
                  className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                    background-color: #333;
                    color: #ccc;
                  `}`}
                >
                  Open Mention in Interaction Panel
                </span>
              }
            >
              <button
                onClick={() =>
                  rest.dispatch?.({
                    type: 'add_mentions',
                    payload: {
                      visible: true,
                      objects: element.quotersList.map(version => {
                        console.log('version', version)

                        return `${version}/${element.id}`
                      }),
                    },
                  })
                }
                className="absolute text-xs font-bold text-info rounded-full hover:bg-muted transition duration-200 leading-none flex items-center justify-center w-6 h-6 text-center"
              >
                {quoters}
              </button>
            </Tippy>
          </div>
        )}
        {children}
      </div>
    </DragDrop>
  )
}

export const Block = React.forwardRef(BlockBase)
