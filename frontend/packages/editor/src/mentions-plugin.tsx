import {useAccount} from '@mintter/app/models/accounts'
import {unpackHmId} from '@mintter/shared'
import {SizableText} from '@mintter/ui'
import {Node} from '@tiptap/core'
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react'
import ReactDOM from 'react-dom/client'
import {AutocompletePopup, createAutoCompletePlugin} from './autocomplete'
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
  console.log(`== ~ createInlineEmbedNode ~ bnEditor:`, bnEditor)
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
      className="inline-embed-token"
      data-inline-embed-ref={props.node.attrs.ref}
    >
      <MentionToken embedRef={props.node.attrs.ref} selected={props.selected} />
    </NodeViewWrapper>
  )
}

export function MentionToken(props: {embedRef: string; selected?: boolean}) {
  const unpackedRef = unpackHmId(props.embedRef)
  const account = useAccount(unpackedRef?.eid)

  return (
    <SizableText
      fontSize="0.9em"
      borderColor={props.selected ? '$blue10' : 'transparent'}
      borderWidth={1}
      display="inline-block"
      paddingHorizontal={2}
      borderRadius="$1"
      fontFamily="$editorBody"
      fontWeight="600"
      color="$blue10"
    >
      @{account.data?.profile?.alias || props.embedRef}
    </SizableText>
  )
}
