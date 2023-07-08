import {Button, Copy, SizableText, XStack} from '@mintter/ui'
import {WidgetDecorationFactory} from '@prosemirror-adapter/core'
import {useWidgetViewContext} from '@prosemirror-adapter/react'
import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {Decoration, DecorationSet} from '@tiptap/pm/view'
import {useMemo} from 'react'
import {useDocCitations} from './models/content-graph'
import {useNavRoute} from './utils/navigation'

export function createRightsideBlockWidgetExtension({
  getWidget,
}: {
  getWidget: WidgetDecorationFactory
}) {
  return Extension.create({
    name: 'rightside-block',
    addProseMirrorPlugins() {
      return [
        createRightsideBlockWidgetPlugin({
          getWidget,
        }),
      ]
    },
  })
}

let RightSidePluginKey = new PluginKey('rightside-block')

export function createRightsideBlockWidgetPlugin({
  getWidget,
}: {
  getWidget: WidgetDecorationFactory
}) {
  return new Plugin({
    key: RightSidePluginKey,
    props: {
      decorations(state) {
        const decorations: Decoration[] = []

        state.doc.descendants((node, pos) => {
          if (!node.attrs.id) return

          const widget = getWidget(pos + node.nodeSize - 1, {
            id: node.attrs.id,
            ignoreSelection: true,
          })
          decorations.push(widget)
        })

        return DecorationSet.create(state.doc, decorations)
      },
    },
  })
}

export function RightsideWidget() {
  let citations = useBlockCitation()
  return (
    <XStack
      // @ts-expect-error
      contentEditable="false"
      height="100%"
      position="absolute"
      right={-40}
      top={0}
    >
      {citations?.length ? (
        <Button size="$1" padding="$2" borderRadius="$2">
          <SizableText size="$1">{citations.length}</SizableText>
        </Button>
      ) : null}
      {/* <Button size="$1" padding="$2" borderRadius="$2" icon={Copy} /> */}
    </XStack>
  )
}

function useBlockCitation() {
  const {spec} = useWidgetViewContext()
  const route = useNavRoute()

  if (route.key != 'publication') return
  const citations = useDocCitations(route.documentId)

  return useMemo(() => {
    if (spec && citations.data?.links.length) {
      return citations.data?.links.filter((link) => {
        return link.target?.blockId == spec.id
      })
    }

    return undefined
  }, [])
}
