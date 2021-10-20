import {Document} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useRoute} from '../../utils/use-route'

export function SectionItem({document, href, onClick}: {document?: Document; onClick?: any; href: string}) {
  const {match} = useRoute(href)
  if (!document) return null
  return (
    <Box
      onClick={onClick}
      css={{
        $$bg: match ? '$colors$primary-soft' : 'transparent',
        $$bgHover: match ? '$colors$primary-default' : '$colors$background-neutral',
        $$foreground: match ? 'white' : '$colors$text-default',
        display: 'flex',
        gap: '$3',
        alignItems: 'center',
        paddingHorizontal: '$3',
        paddingVertical: '$2',
        borderRadius: '$2',
        backgroundColor: '$$bg',
        '&:hover': {
          cursor: 'pointer',
          backgroundColor: '$$bgHover',
        },
      }}
    >
      <Icon name="File" size="1" css={{color: '$$foreground'}} />
      <Text
        size="2"
        css={{flex: '1', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', color: '$$foreground'}}
      >
        {document.title ? document.title : 'Untitled Document'}
      </Text>
    </Box>
  )
}
