import {useDocument, usePublication} from '@mintter/client/hooks'
import {useState, useEffect} from 'react'
import {Box, Text} from '@mintter/ui'
import {getQuoteIds} from '../quote-plugin'
import type {EditorBlock, EditorLink, EditorQuote} from '../types'
import {useLinkEmbeds} from '../use-link-embeds'
import {Link} from '../../components/link'

type AnnotationListProps = {
  quote: EditorQuote
}
export function AnnotationList({quote}) {
  const linkEmbeds = useLinkEmbeds(quote)
  const [embeds, setEmbeds] = useState({})

  useEffect(() => {
    if (linkEmbeds) {
      for (let [node, path] of linkEmbeds) {
        setEmbeds((prev) => ({...prev, [node.url]: node}))
      }
    }
  }, [quote])

  return Object.values(embeds).length > 0 ? (
    <Box
      contentEditable={false}
      css={{
        position: 'absolute',
        right: 0,
        top: 0,
        padding: '$2',
        transform: 'translateX(calc(100% + 16px))',
        maxWidth: 160,
        overflow: 'hidden',
      }}
    >
      {Object.values(embeds).map((node: EditorQuote | EditorLink) => (
        <AnnotationItem node={node} />
      ))}
    </Box>
  ) : null
}

function AnnotationItem({node, ...props}: {node: EditorQuote | EditorLink}) {
  const [publicationId] = getQuoteIds(node.url)
  const {status, data} = usePublication(publicationId)

  if (status == 'success' && data?.document) {
    return (
      <Box
        as={Link}
        to={`/p/${publicationId}`}
        css={{
          padding: '$1',
          borderRadius: '$2',
          display: 'block',
          textDecoration: 'none',
          '&:hover': {
            backgroundColor: '$primary-muted',
            cursor: 'pointer',
          },
        }}
        {...props}
      >
        <Text size="2" alt color="primary">
          {data?.document.title}
        </Text>
        <Text
          color="primary"
          css={{
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
          size="1"
        >
          {data?.document.author}
        </Text>
      </Box>
    )
  } else {
    return <Text size="1">...</Text>
  }
}
