import React from 'react'
import {DragDrop} from './DragDrop'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'

export function BlockBase({attributes, element, children, getData}, ref) {
  const [isQuotesVisible, toggleQuotes] = React.useState<boolean>(false)
  let quoters = element.quotersList?.length
  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      {children}
      {isQuotesVisible ? (
        <div contentEditable={false}>
          {quoters ? (
            element.quotersList.map(quote => (
              <BlockMention key={quote} quote={quote} getData={getData} />
            ))
          ) : (
            <p>...</p>
          )}
        </div>
      ) : null}
      {quoters !== 0 && (
        <div
          contentEditable={false}
          style={{userSelect: 'none'}}
          className={`absolute ${css`
            top: 2px;
            right: -18px;
            transform: translateX(100%);
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
              onClick={() => toggleQuotes(val => !val)}
              className="text-xs font-bold text-info rounded-full hover:bg-muted transition duration-200 leading-none flex items-center justify-center w-6 h-6 text-center"
            >
              {quoters}
            </button>
          </Tippy>
        </div>
      )}
    </DragDrop>
  )
}

export const Block = React.forwardRef(BlockBase)

function BlockMention({quote, getData}) {
  const [docData, setData] = React.useState<any>(null)

  React.useEffect(() => {
    async function init() {
      const res = await getData(quote)
      setData(res)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return docData ? (
    <div className="px-4 py-2 bg-muted rounded mt-4">
      <p className="font-bold text-heading text-sm leading-tight">
        {docData.document.title}
      </p>
      <p className="text-xs text-body-muted leading-tight">
        {docData.author.username}
      </p>
    </div>
  ) : (
    <div className="px-4 py-2 bg-muted rounded mt-4">
      <p className="font-bold text-heading text-sm leading-tight">...</p>
      <p className="text-xs text-body-muted leading-tight">...</p>
    </div>
  )
}
