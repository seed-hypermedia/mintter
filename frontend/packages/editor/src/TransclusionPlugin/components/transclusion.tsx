import React from 'react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'
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
          className={`absolute text-xs text-left text-body-muted px-2 top-0 group ${css`
            right: -14px;
            transform: translateX(100%);
          `}`}
        >
          {transclusionData ? (
            <>
              <p
                className={`text-xs font-bold truncate ${css`
                  max-width: 180px;
                `}`}
              >
                {transclusionData?.document.title}
              </p>
              <p className="text-xs font-light">
                {transclusionData?.author.username}
              </p>
            </>
          ) : (
            <div className="mx-2">
              <p className="text-xs font-light">...</p>
            </div>
          )}
          <button
            onClick={handlePush}
            className="transition duration-100 group-hover:opacity-100 group-hover:visible invisible opacity-0 font-bold text-primary"
          >
            Open in Interaction Panel →
          </button>
        </div>

        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
