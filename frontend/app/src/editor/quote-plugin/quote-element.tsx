import {useCallback} from 'react'
import {useFocused, useSelected} from 'slate-react'
import {Box} from '@mintter/ui'
import {theme} from '@mintter/ui/stitches.config'
import type {SPRenderElementProps} from '@udecode/slate-plugins-core'
import {useQuote} from '@mintter/client/hooks'
import type {EditorTextRun, EditorQuote} from '../types'
import type {Block, Document, InlineElement} from '@mintter/client'
import {InlineQuote, renderQuoteInlineElements} from './inline-quote'
import {MINTTER_LINK_PREFIX} from '../link-plugin'

export function QuoteElement({attributes, className, element, children}: SPRenderElementProps<EditorQuote>) {
  const focused = useFocused()
  const selected = useSelected()
  const [documentId, quoteId] = getQuoteIds(element.url)
  const {data, isLoading, isSuccess, isError} = useQuote(documentId, quoteId)
  console.log('🚀 ~ quote-element.tsx ~ ', {data, isLoading, isSuccess, isError})

  const renderElements = useCallback(renderQuoteInlineElements, [data])
  let qRender

  const renderElement = useCallback(({text = ''}, index) => <span key={index}>{text}</span>, [])

  if (isLoading) {
    qRender = <span>...</span>
  }

  if (isError) {
    qRender = <span>Error fetching quote {element.id}</span>
  }

  if (isSuccess && data) {
    console.log('🚀 ~ file: quote-element.tsx ~ line 35 ~ QuoteElement ~ data.quote', data)
    if (!data.quote) {
      console.log('no hay quote!', {data})
      qRender = data.document.title
    } else {
      qRender = data.quote.elements.map((element: InlineElement) => renderElements(element, data.document))
    }
  }
  return (
    <span {...attributes} data-quote-id={element.id}>
      <Box
        as="span"
        contentEditable={false}
        css={{
          position: 'relative',
          paddingHorizontal: '$2',
          paddingVertical: '$1',
          overflow: 'hidden',
          borderRadius: '$1',
          border: '2px solid',
          borderColor: focused && selected ? '$primary-default' : '$primary-muted',
          backgroundColor: '$background-muted',
          '&:hover': {
            cursor: 'pointer',
            backgroundColor: '$background-neutral',
            '&:before': {
              height: '100%',
            },
          },
        }}
      >
        {qRender}
      </Box>
      {children}
    </span>
  )
}

function toEditorQuote(entry: Block): Array<EditorTextRun> {
  //@ts-ignore
  return entry.elements.map((element: documents.InlineElement.AsObject) => {
    // assume elements are type textRun for now
    const node: EditorTextRun = {text: ''}
    if (element.textRun) {
      const {textRun} = element
      node.text = textRun.text
      Object.keys(textRun).forEach(
        //@ts-ignore
        (key) => {
          //@ts-ignore
          if (typeof textRun[key] === 'boolean' && textRun[key]) {
            //@ts-ignore
            node[key] = true
          }
        },
      )

      return node
      // console.log({node})
      // return element.textRun
    }

    return null
  })
}

export function getQuoteIds(entry: string): [string, string] {
  if (!entry.startsWith(MINTTER_LINK_PREFIX)) {
    throw Error(`getQuoteId Error: url must start with ${MINTTER_LINK_PREFIX}. (${entry})`)
  }

  const [, ids] = entry.split(MINTTER_LINK_PREFIX)

  if (ids.length <= 2) {
    throw Error(`getQuoteId Error: url must contain a documentId and a blockId at least. (${entry})`)
  }
  const [one, second] = ids.split('/')
  return [one, second]
}
