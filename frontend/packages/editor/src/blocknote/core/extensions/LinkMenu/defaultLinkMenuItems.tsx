import {youtubeParser} from '@/utils'
import {
  HYPERMEDIA_ENTITY_TYPES,
  StateStream,
  UnpackedHypermediaId,
  isHypermediaScheme,
  isPublicGatewayLink,
  normalizeHmId,
} from '@mintter/shared'
import {Globe, Link, Spinner, SquareAsterisk, TwitterXIcon} from '@mintter/ui'
import {Node} from '@tiptap/pm/model'
import {BlockNoteEditor} from '../../BlockNoteEditor'
import {getBlockInfoFromPos} from '../Blocks/helpers/getBlockInfoFromPos'
import {LinkMenuItem} from './LinkMenuItem'

export function getLinkMenuItems({
  isLoading,
  hmId,
  media,
  sourceUrl,
  fileName,
  docTitle,
  gwUrl,
}: {
  isLoading: boolean // true is spinner needs to be shown
  hmId?: UnpackedHypermediaId | null // if the link is an embeddable link
  media?: string // type of media block if link points to a media file
  sourceUrl?: string // the inserted link into the editor. needed to correctly replace the link with block
  fileName?: string // file name if any
  docTitle?: string | null // document title if any
  gwUrl: StateStream<string>
}) {
  const linkMenuItems: LinkMenuItem[] = []

  if (sourceUrl && !isHypermediaScheme(sourceUrl)) {
    linkMenuItems.unshift({
      name: 'Web Link',
      disabled: false,
      icon: <Globe size={18} />,
      execute: (editor: BlockNoteEditor, ref: string) => {
        const {state, schema, view} = editor._tiptapEditor
        const {selection} = state
        const pos = selection.from - docTitle!.length
        view.dispatch(
          view.state.tr
            .deleteRange(pos, pos + docTitle!.length)
            .insertText(docTitle!, pos)
            .addMark(
              pos,
              pos + docTitle!.length,
              schema.mark('link', {
                href: sourceUrl,
              }),
            ),
        )
      },
    })
  }

  if (isLoading) {
    const loadingItem = {
      name: 'Checking link...',
      icon: <Spinner size="small" />,
      disabled: true,
      execute: (editor, ref) => {},
    }

    linkMenuItems.unshift(loadingItem)
  } else {
    if (hmId) {
      if (hmId.type !== 'c') {
        // comments are not supported for card embeds yet

        linkMenuItems.unshift({
          name: `Insert Card of ${
            docTitle ? '"' + docTitle + '"' : HYPERMEDIA_ENTITY_TYPES[hmId.type]
          }`,
          disabled: false,
          icon: <SquareAsterisk size={18} />,
          execute: (editor: BlockNoteEditor, ref: string) => {
            if (isPublicGatewayLink(ref, gwUrl) || isHypermediaScheme(ref)) {
              const hmId = normalizeHmId(ref, gwUrl)
              if (!hmId) return
              ref = hmId
            }
            const {state, schema} = editor._tiptapEditor
            const {selection} = state
            if (!selection.empty) return
            const node = schema.nodes.embed.create(
              {
                url: ref,
                view: 'card',
              },
              schema.text(' '),
            )

            insertNode(editor, sourceUrl || ref, node)
          },
        })
      }

      if (hmId.type) {
        linkMenuItems.unshift({
          name: `Embed ${HYPERMEDIA_ENTITY_TYPES[hmId.type]} ${
            docTitle ? '"' + docTitle + '"' : HYPERMEDIA_ENTITY_TYPES[hmId.type]
          }`,
          disabled: false,
          icon: <SquareAsterisk size={18} />,
          execute: (editor: BlockNoteEditor, ref: string) => {
            if (isPublicGatewayLink(ref, gwUrl) || isHypermediaScheme(ref)) {
              const hmId = normalizeHmId(ref, gwUrl)
              if (!hmId) return
              ref = hmId
            }
            const {state, schema} = editor._tiptapEditor
            const {selection} = state
            if (!selection.empty) return
            const node = schema.nodes.embed.create(
              {
                url: ref,
                view: 'content',
              },
              schema.text(' '),
            )

            insertNode(editor, sourceUrl || ref, node)
          },
        })
      }

      if (docTitle && docTitle !== sourceUrl) {
        // linkMenuItems.unshift({
        //   name: `Mention as "${docTitle}"`,
        //   disabled: false,
        //   icon: <SquareAsterisk size={18} />,
        //   execute: (editor: BlockNoteEditor, ref: string) => {
        //     // this is the default behavior of HM links and is already applied by this time
        //   },
        // })
        linkMenuItems.unshift({
          name: `Link as "${docTitle}"`,
          disabled: false,
          icon: <Link size={18} />,
          execute: (editor: BlockNoteEditor, ref: string) => {
            // this is the default behavior of HM links and is already applied by this time
          },
        })
      }
    } else if (media) {
      const mediaItem = {
        name: `Convert to ${
          media === 'twitter'
            ? 'X Post embed'
            : media.charAt(0).toUpperCase() + media.slice(1)
        }`,
        disabled: false,
        icon:
          media === 'twitter' ? (
            <TwitterXIcon width={18} height={18} />
          ) : undefined,
        execute: (editor: BlockNoteEditor, ref: string) => {
          const {state, schema} = editor._tiptapEditor
          const {selection} = state
          if (!selection.empty) return
          let embedUrl = ''
          if (media === 'video') {
            let videoUrl = ''
            if (ref.includes('youtu.be') || ref.includes('youtube')) {
              let ytId = youtubeParser(ref)
              if (ytId) {
                videoUrl = `https://www.youtube.com/embed/${ytId}`
              } else {
                videoUrl = ''
              }
            } else if (ref.includes('vimeo')) {
              const urlArray = ref.split('/')
              videoUrl =
                'https://player.vimeo.com/video/' +
                urlArray[urlArray.length - 1]
            }
            embedUrl = videoUrl
          }
          const node =
            media !== 'twitter'
              ? schema.nodes[media].create({
                  url: embedUrl ? embedUrl : '',
                  src: embedUrl ? '' : ref,
                  name: fileName ? fileName : '',
                })
              : schema.nodes['web-embed'].create({
                  url: ref,
                })

          insertNode(editor, sourceUrl ? sourceUrl : ref, node)
        },
      }

      linkMenuItems.unshift(mediaItem)
    }
  }

  return linkMenuItems
}

function insertNode(editor: BlockNoteEditor, ref: string, node: Node) {
  const {state, schema, view} = editor._tiptapEditor
  const {doc, selection} = state
  const {$from} = selection
  const block = getBlockInfoFromPos(doc, selection.$anchor.pos)
  let tr = state.tr

  // If inserted link inline with other text (child count will be more than 1)
  if (block.contentNode.content.childCount > 1) {
    const $pos = state.doc.resolve($from.pos)
    let originalStartContent = state.doc.cut(
      $pos.start(),
      $pos.pos - ref.length,
    )
    let originalLastContent = state.doc.cut($pos.pos, $pos.end())
    const originalContent: Node[] = []
    originalStartContent.descendants((childNode) => {
      if (childNode.type.name === 'text') originalContent.push(childNode)
    })
    originalLastContent.descendants((childNode) => {
      if (childNode.type.name === 'text') originalContent.push(childNode)
    })
    const originalNode = schema.node(
      block.contentType,
      block.contentNode.attrs,
      originalContent,
    )

    const newBlock = state.schema.nodes['blockContainer'].createAndFill()!
    const nextBlockPos = $pos.end() + 2
    const nextBlockContentPos = nextBlockPos + 2
    tr = tr.insert(nextBlockPos, newBlock)
    const $nextBlockPos = state.doc.resolve(nextBlockContentPos)
    tr = tr.replaceWith(
      $nextBlockPos.before($nextBlockPos.depth),
      nextBlockContentPos + 1,
      node,
    )
    tr = tr.replaceWith($pos.before($pos.depth), $pos.end(), originalNode)
  } else {
    tr = tr.replaceWith($from.before($from.depth), $from.pos, node)
  }
  view.dispatch(tr)
}
