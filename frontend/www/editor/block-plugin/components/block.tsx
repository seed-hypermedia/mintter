import React from 'react'
import {DragDrop} from './drag-drop'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {Icons} from 'components/icons'
import {Tooltip} from 'components/tooltip'

export const Block = ({
  attributes,
  element,
  children,
  getData,
  onMainPanel,
  onSidePanel,
  ...rest
}: any) => {
  const [isQuotesVisible, setVisibility] = React.useState<boolean>(false)
  const quoters = element.quotersList?.length
  function toggleQuotes() {
    setVisibility(val => !val)
  }
  return (
    <DragDrop {...attributes} element={element} {...rest}>
      {children}
      {isQuotesVisible ? (
        <div contentEditable={false} className="overflow-hidden pl-4">
          {quoters ? (
            element.quotersList.map(quote => (
              <BlockMention
                key={quote}
                quote={quote}
                getData={getData}
                onMainPanel={onMainPanel}
                onSidePanel={onSidePanel}
              />
            ))
          ) : (
            <p>...</p>
          )}
        </div>
      ) : null}
      {quoters > 0 && (
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
                Toggle Mentions
              </span>
            }
          >
            <button
              onClick={() => toggleQuotes()}
              className="text-xs font-bold text-info rounded-full hover:bg-background-muted transition duration-200 leading-none flex items-center justify-center w-6 h-6 text-center"
            >
              {quoters}
            </button>
          </Tippy>
        </div>
      )}
    </DragDrop>
  )
}

function BlockMentionComponent({quote, getData, onMainPanel, onSidePanel}) {
  const [docData, setData] = React.useState<any>(null)
  const title = docData?.document?.title || 'Untitled Document'
  const author = docData?.author?.username || 'No-name author'
  React.useEffect(() => {
    async function init() {
      const res = await getData(quote)
      setData(res)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return docData ? (
    <div className="relative pt-4">
      <div
        className={`w-4 border-l border-b border-b-background border-l-background rounded-bl absolute top-0 left-0 ${css`
          height: calc(100% + 10px);
          z-index: 0;
          transform: translateY(-44%);
        `}`}
      />
      <div className="bg-background-muted transition duration-150 hover:shadow-sm rounded ml-4 flex items-center group">
        <div className="px-4 py-2 flex-1">
          <p className="font-bold text-heading text-sm leading-tight">
            {title}
          </p>
          <p className="text-xs text-body-muted leading-tight">{author}</p>
        </div>
        <div className="px-4 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-150">
          {docData.isVisibleInMainPanel ? (
            <Tooltip content="Open in Main Panel">
              <button
                className="bg-background hover:bg-muted transition duration-150 rounded-sm p-1"
                onClick={() => onMainPanel?.(quote)}
              >
                <Icons.ArrowUpRight size={14} color="currentColor" />
              </button>
            </Tooltip>
          ) : null}

          <Tooltip content="Show in Sidepanel">
            <button
              className="bg-background hover:bg-muted transition duration-150 rounded-sm p-1"
              onClick={() => onSidePanel?.(quote)}
            >
              <Icons.CornerDownRight size={14} color="currentColor" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  ) : (
    <div className="relative pt-4">
      <div
        className={`w-4 border-l border-b border-b-background border-l-background rounded-bl absolute top-0 left-0 ${css`
          height: calc(100% + 10px);
          z-index: 0;
          transform: translateY(-44%);
        `}`}
      />
      <div className="bg-background transition duration-150 hover:shadow-sm rounded ml-4 flex items-center group">
        <div className="px-4 py-2 flex-1">
          <p className="font-bold text-heading text-sm leading-tight">...</p>
          <p className="text-xs text-body-muted leading-tight">...</p>
        </div>
      </div>
    </div>
  )
}

const BlockMention = React.memo(BlockMentionComponent)
