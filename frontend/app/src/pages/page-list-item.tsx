import {DraftRef, PublicationRef} from '@app/main-machine'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {useMemo} from 'react'

type PageListItemProps = {
  isNew: boolean
  fileRef: PublicationRef | DraftRef
}

export function PageListItem(props: PageListItemProps) {
  let [state] = useActor(props.fileRef)
  const isPublication = useMemo(() => props.fileRef.id.startsWith('pub-'), [])

  return (
    <Box className={listItemRoot()}>
      <Text size="4" fontWeight="medium" className={itemTitle()}>
        {state.context.title || 'Untitled Document'}
      </Text>
      <Box className={itemListFooter()}>
        <Text size="2" color="muted">
          {state.context.author?.profile?.alias}
        </Text>
        {isPublication && (
          <Text size="2" color="muted">
            {(
              state.context.publication.document.createTime as Date
            ).toISOString()}
          </Text>
        )}
      </Box>
    </Box>
  )
}

var listItemRoot = css({
  overflow: 'hidden',
  borderRadius: '$2',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-hover',
  },
})

var itemTitle = css({
  paddingBlock: '$2',
  paddingInline: '$3',
})

var itemListFooter = css({
  display: 'inline-flex',
  gap: '1px',
  alignContent: 'start',
  alignItems: 'flex-start',
  // marginBlockStart: '$3',
  paddingBlock: '$3',
  '> *': {
    paddingInline: '$3',
  },
})
