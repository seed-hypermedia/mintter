import {useFocused, useSelected} from 'slate-react'
import {Box} from '@mintter/ui'
import type {SPRenderElementProps} from '@udecode/slate-plugins-core'
import {useQuote} from '@mintter/client/hooks'
import type {EditorTextRun, EditorQuote} from '../types'
import type {Block} from '@mintter/client'

export function QuoteElement({
  attributes,
  className,
  element,
  children,
}: SPRenderElementProps<EditorQuote>) {
  const focused = useFocused()
  const selected = useSelected()
  const quote = useQuote(element.url)
  let qRender

  if (quote.isLoading) {
    qRender = <span>...</span>
  }

  if (quote.isError) {
    qRender = <span>Error fetching quote {element.id}</span>
  }

  if (quote.isSuccess && quote.data) {
    qRender = toEditorQuote(quote.data).map(({text = ''}, index) => (
      <span key={index}>{text}</span>
    ))
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
            color: '$secondary-strong',
            borderRadius: '$1',
            backgroundColor:
              focused && selected ? '$background-neutral' : 'transparent',
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

  return null
}

function toEditorQuote(entry: Block): Array<EditorTextRun> {
  //@ts-ignore
  return entry.elementsList.map((element: documents.InlineElement.AsObject) => {
    // assume elements are type textRun for now
    const node: EditorTextRun = {text: ''}
    if (element.textRun) {
      const {textRun} = element
      node.text = textRun.text
      Object.keys(textRun).forEach(
        //@ts-ignore
        key => {
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
