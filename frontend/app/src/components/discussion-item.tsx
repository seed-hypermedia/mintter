import {MINTTER_LINK_PREFIX} from '@app/constants'

import {citationMachine, CitationProvider} from '@app/editor/citations'
import {ContextMenu} from '@app/editor/context-menu'
import {Editor} from '@app/editor/editor'
import {EditorMode} from '@app/editor/plugin-utils'
import {useAccount} from '@app/hooks'
import {useMainPage} from '@app/main-page-context'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {GetBlockResult} from '@app/utils/get-block'
import {getDateFormat} from '@app/utils/get-format-date'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useInterpret} from '@xstate/react'
import toast from 'react-hot-toast'

export function DiscussionItem({entry}: {entry: GetBlockResult}) {
  const {data: author} = useAccount(entry.publication.document?.author)
  const bookmarkService = useBookmarksService()
  const mainPageService = useMainPage()
  const citationService = useInterpret(() =>
    citationMachine.withContext({
      link: entry,
    }),
  )

  let url =
    entry.publication.document && entry.block
      ? `${MINTTER_LINK_PREFIX}${entry.publication.document?.id}/${entry.publication.version}/${entry?.block.id}`
      : ''

  function addBookmark() {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url,
    })
  }

  async function onCopy() {
    await copyTextToClipboard(url)
    toast.success('Embed Reference copied successfully', {
      position: 'top-center',
    })
  }

  function onGoToPublication() {
    mainPageService.send({
      type: 'GO.TO.PUBLICATION',
      docId: entry.publication.document!.id,
      version: entry.publication.version,
      blockId: 'hola',
    })
  }

  const {block, publication} = entry
  return (
    <CitationProvider value={citationService}>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            css={{
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              '&:hover': {
                cursor: 'pointer',
              },
            }}
          >
            <Box
              css={{
                marginLeft: -32,
              }}
            >
              {entry.publication.document?.content && (
                <Editor
                  mode={EditorMode.Discussion}
                  value={entry.publication.document.content}
                />
              )}
            </Box>

            <Box
              css={{
                paddingVertical: '$6',
                $$gap: '16px',
                display: 'flex',
                gap: '$$gap',
                alignItems: 'center',
                '& *': {
                  position: 'relative',
                },
                '& *:not(:first-child):before': {
                  content: `"|"`,
                  color: '$base-text-low',
                  opacity: 0.5,
                  position: 'absolute',
                  left: '-10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                },
              }}
            >
              <Text size="1" color="muted">
                {publication?.document?.title}
              </Text>
              {author && (
                <Text size="1" color="muted" css={{paddingRight: '$3'}}>
                  <span>Signed by </span>
                  <span style={{textDecoration: 'underline'}}>
                    {author.profile?.alias}
                  </span>
                </Text>
              )}

              <Text size="1" color="muted">
                Created on:{' '}
                {getDateFormat(entry.publication?.document, 'createTime')}
              </Text>
              <Text size="1" color="muted">
                Last modified:{' '}
                {getDateFormat(entry.publication?.document, 'updateTime')}
              </Text>
            </Box>
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Embed Reference</Text>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={addBookmark}>
            <Icon name="ArrowChevronDown" size="1" />
            <Text size="2">Add to Bookmarks</Text>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onGoToPublication()}>
            <Icon name="ArrowTopRight" size="1" />
            <Text size="2">Open Embed in main Panel</Text>
          </ContextMenu.Item>
          <ContextMenu.Item
            onSelect={() =>
              mainPageService.send({
                type: 'COMMIT.OPEN.WINDOW',
                path: `/p/${entry.publication.document?.id}/${entry.publication.version}/${entry.block?.id}`,
              })
            }
          >
            <Icon name="OpenInNewWindow" size="1" />
            <Text size="2">Open Embed in new Window</Text>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </CitationProvider>
  )
}
