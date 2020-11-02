import {Icons} from '../../components/icons'
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
          className={`absolute ${css`
            top: -2px;
            right: -14px;
            transform: translateX(100%);
          `}`}
        >
          <Tippy
            placement="right-end"
            content={
              transclusionData ? (
                <div className="p-2 rounded-sm shadow bg-white">
                  <p className="text-xs font-bold">
                    {transclusionData?.document.title}
                  </p>
                  <p className="text-xs font-light">
                    {transclusionData?.author.username}
                  </p>
                  <p className="text-xs text-blue-700 font-bold mt-2">
                    Open in Interaction Panel →
                  </p>
                </div>
              ) : (
                <div className="p-2 rounded-sm shadow bg-white">...</div>
              )
            }
          >
            <button
              onClick={handlePush}
              className="text-xs text-body-muted p-1 rounded-sm hover:bg-muted transition duration-100"
            >
              <Icons.CornerUpRight size={12} />
            </button>
          </Tippy>
        </div>

        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
