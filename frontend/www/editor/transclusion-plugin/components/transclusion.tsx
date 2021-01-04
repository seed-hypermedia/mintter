import React from 'react'
import {DragDrop} from '../../block-plugin/components/drag-drop'
import {css} from 'emotion'

export const Transclusion = ({
  attributes,
  children,
  element,
  getData,
  dispatch,
}) => {
  const [transclusionData, setData] = React.useState<any>(null)

  React.useEffect(() => {
    async function init() {
      const res = await getData(element.id)
      setData(res)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function handlePush(e) {
    e.preventDefault()

    dispatch?.({type: 'add_object', payload: element.id})
  }

  return (
    <DragDrop {...attributes} element={element}>
      {children}
      <div
        contentEditable={false}
        className={`absolute text-xs text-left text-body-muted px-4 top-0 right-0 group ${css`
          transform: translateX(100%);
          right: -8px;
        `}`}
      >
        <button className="text-left" onClick={handlePush}>
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

          <span className="transition duration-100 group-hover:opacity-100 group-hover:visible invisible opacity-0 font-bold text-primary">
            Show in Sidepanel →
          </span>
        </button>
      </div>
    </DragDrop>
  )
}
