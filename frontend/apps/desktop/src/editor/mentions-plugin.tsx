import {
  AutocompletePopup,
  createAutoCompletePlugin,
} from '@/editor/autocomplete'
import {useAccount_deprecated} from '@/models/accounts'
import {useDocument} from '@/models/documents'
import {getDocumentTitle, UnpackedHypermediaId, unpackHmId} from '@shm/shared'
import {SizableText} from '@shm/ui'
import {Node} from '@tiptap/core'
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react'
import ReactDOM from 'react-dom/client'
import './inline-embed.css'
/**
 * we need
 * - a inline atom node to render the inline references
 * - a plugin that captures the keys pressed and opens the suggestions menu when we need it
 * - an autocomplete plugin that filters the list when we type after the trigger
 * - serialize/deserialize mentions to the backend
 *
 */

var inlineEmbedPopupElement = document.createElement('div')
document.body.append(inlineEmbedPopupElement)
var popupRoot = ReactDOM.createRoot(inlineEmbedPopupElement)

export function createInlineEmbedNode(bnEditor: any) {
  let {nodes, plugins} = createAutoCompletePlugin({
    nodeName: 'inline-embed',
    triggerCharacter: '@',
    renderPopup: (state, actions) => {
      popupRoot.render(
        <AutocompletePopup editor={bnEditor} state={state} actions={actions} />,
      )
    },
  })

  const InlineEmbedNode = Node.create({
    atom: nodes['inline-embed'].atom,
    name: 'inline-embed',
    group: 'inline',
    inline: nodes['inline-embed'].inline,
    addNodeView() {
      return ReactNodeViewRenderer(InlineEmbedNodeComponent)
    },
    renderHTML() {
      return ['span']
    },
    parseHTML() {
      return [
        {
          tag: `span[data-inline-embed]`,
          getAttrs: (dom) => {
            if (dom instanceof HTMLElement) {
              var value = dom.getAttribute('data-inline-embed')
              return {ref: value}
            }
            return false
          },
        },
      ]
    },
    addAttributes() {
      return {
        ref: {
          default: '',
        },
      }
    },
    addProseMirrorPlugins() {
      return plugins
    },
  })

  return InlineEmbedNode
}

function InlineEmbedNodeComponent(props: any) {
  return (
    <NodeViewWrapper
      className={`inline-embed-token${props.selected ? ' selected' : ''}`}
      data-inline-embed-ref={props.node.attrs.ref}
    >
      <MentionToken value={props.node.attrs.ref} selected={props.selected} />
    </NodeViewWrapper>
  )
}

export function MentionToken(props: {value: string; selected?: boolean}) {
  const unpackedRef = unpackHmId(props.value)

  if (unpackedRef?.type == 'a') {
    return <AccountMention unpackedRef={unpackedRef} {...props} />
  } else if (unpackedRef?.type == 'd') {
    return <DocumentMention unpackedRef={unpackedRef} {...props} />
  } else {
    console.log('=== MENTION ERROR', props)
    return <MentionText>ERROR</MentionText>
  }
}

function AccountMention({
  unpackedRef,
  selected,
}: {
  unpackedRef: UnpackedHypermediaId
  selected?: boolean
}) {
  const account = useAccount_deprecated(unpackedRef.eid)

  return (
    <MentionText selected={selected}>
      @{account.data?.profile?.alias || unpackedRef.eid}
    </MentionText>
  )
}

function DocumentMention({
  unpackedRef,
  selected,
}: {
  unpackedRef: UnpackedHypermediaId
  selected?: boolean
}) {
  const doc = useDocument(unpackedRef.qid, unpackedRef.version || undefined)

  if (doc.status == 'loading') {
    return <MentionText>...</MentionText>
  }

  return (
    <MentionText selected={selected}>
      {doc.data ? getDocumentTitle(doc.data) : unpackedRef.qid}
    </MentionText>
  )
}

export function MentionText(props) {
  return (
    <SizableText
      fontSize="1em"
      paddingHorizontal={1}
      style={{
        display: 'inline-block',
        fontFamily: 'inherit !important',
      }}
      color="$mint11"
      outlineColor="$mint11"
    >
      {props.children}
    </SizableText>
  )
}
