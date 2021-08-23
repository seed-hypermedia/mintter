import {useCallback} from 'react'
import type {Document, Quote, Link, InlineElement} from '@mintter/client'
import {useQuote} from '@mintter/client/hooks'
import {getQuoteIds} from './quote-element'

export type InlineQuoteProps = {
  quote: Quote
  link: Link
  key: any
}

export function InlineQuote({quote, link, index}: InlineQuoteProps) {
  const [documentId, quoteId] = getQuoteIds(link.uri)
  const {isLoading, isError, isSuccess, error, data} = useQuote(documentId, quoteId)

  const renderElements = useCallback(renderQuoteInlineElements, [data])

  if (isLoading) {
    return <span key={index}>...</span>
  }

  if (isError) {
    console.error(`InlineQuote error: ${error}`)
    return <span key={index}>Quote ERROR :(</span>
  }

  if (isSuccess && data) {
    return (
      <span key={index}>
        {data.quote.elements.map((element: InlineElement, index) => renderElements(element, data.document, index))}
      </span>
    )
  }

  return null
}

export const renderQuoteInlineElements = ({textRun, quote}: InlineElement, document: Document, index: number) => {
  if (textRun) {
    return <span key={index}>{textRun.text}</span>
  }

  if (quote) {
    console.log({quoteData: document.links[quote.linkKey]})
    return <InlineQuote index={index} quote={quote} link={document.links[quote.linkKey]} />
  }

  return null
}
