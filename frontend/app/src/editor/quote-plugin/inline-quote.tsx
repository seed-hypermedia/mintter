import {useCallback} from 'react'
import type {Document, Quote, Link, InlineElement} from '@mintter/client'
import {useQuote} from '@mintter/client/hooks'

export type InlineQuoteProps = {
  quote: Quote
  link: Link
}

export function InlineQuote({quote, link}: InlineQuoteProps) {
  const {isLoading, isError, isSuccess, error, data} = useQuote(link.uri, quote.linkKey)

  const renderElements = useCallback(renderQuoteInlineElements, [data])

  if (isLoading) {
    return <span>quote loading...</span>
  }

  if (isError) {
    console.error(`InlineQuote error: ${error}`)
    return <span>Quote ERROR :(</span>
  }

  if (isSuccess && data) {
    return <span>{data.quote.elements.map((element: InlineElement) => renderElements(element, data.document))}</span>
  }

  return null
}

export const renderQuoteInlineElements = ({textRun, quote}: InlineElement, document: Document) => {
  if (textRun) {
    return <span>{textRun.text}</span>
  }

  if (quote) {
    return <InlineQuote quote={quote} link={document.links[quote.linkKey]} />
  }

  return null
}
