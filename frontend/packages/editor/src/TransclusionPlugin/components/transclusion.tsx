import React from 'react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'
import Tippy from '@tippyjs/react'
import {css} from 'emotion'

const Transclusion = (
  {attributes, children, element, className, ...rest},
  ref,
) => {
  const [transclusionData, setData] = React.useState<any>(null)

  React.useEffect(() => {
    async function init() {
      const res = await rest.getData(element.id)
      setData(res)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function handlePush(e) {
    e.preventDefault()
    rest.dispatch?.({type: 'add_object', payload: element.id})
  }

  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div
        className={`pr-0 relative rounded mt-6 outline-none ${
          className ? className : ''
        }`}
      >
        <div
          contentEditable={false}
          className={`absolute flex items-start ${css`
            top: -2px;
            right: -14px;
            transform: translateX(100%);
          `}`}
        >
          <Tippy
            placement="right-start"
            content={
              <span
                className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                  background-color: #333;
                  color: #ccc;
                `}`}
              >
                Open in Interaction Panel →
              </span>
            }
          >
            <button
              onClick={handlePush}
              className="text-xs text-left text-body-muted py-1 px-2 rounded-sm hover:bg-muted transition duration-100"
            >
              {transclusionData ? (
                <div>
                  <p className="text-xs font-bold">
                    {transclusionData?.document.title}
                  </p>
                  <p className="text-xs font-light">
                    {transclusionData?.author.username}
                  </p>
                </div>
              ) : (
                <div className="mx-2">
                  <p className="text-xs font-light">...</p>
                </div>
              )}
            </button>
          </Tippy>
        </div>

        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
