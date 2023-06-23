import {fetchWebLink} from '@app/models/web-links'
import {toast} from '@app/toast'
import {
  getIdsfromUrl,
  isMintterGatewayLink,
  isHyperdocsScheme,
  createHyperdocsDocLink,
} from '@mintter/shared'
import {Mark, mergeAttributes} from '@tiptap/core'
import {MarkType} from '@tiptap/pm/model'
import {Plugin, PluginKey, PluginSpec, Transaction} from '@tiptap/pm/state'
import {AddMarkStep, Step} from '@tiptap/pm/transform'
import {EditorView} from '@tiptap/pm/view'
import {Editor} from '@tiptap/react'
import {registerCustomProtocol, reset} from 'linkifyjs'

import {autolink} from './helpers/autolink'
import {clickHandler} from './helpers/clickHandler'
import {pasteHandler} from './helpers/pasteHandler'

export interface LinkProtocolOptions {
  scheme: string
  optionalSlashes?: boolean
}

export interface LinkOptions {
  /**
   * If enabled, it adds links as you type.
   */
  autolink: boolean
  /**
   * An array of custom protocols to be registered with linkifyjs.
   */
  protocols: Array<LinkProtocolOptions | string>
  /**
   * If enabled, links will be opened on click.
   */
  openOnClick: boolean
  /**
   * Adds a link to the current selection if the pasted content only contains an url.
   */
  linkOnPaste: boolean
  /**
   * A list of HTML attributes to be rendered.
   */
  HTMLAttributes: Record<string, any>
  /**
   * A validation function that modifies link verification for the auto linker.
   * @param url - The url to be validated.
   * @returns - True if the url is valid, false otherwise.
   */
  validate?: (url: string) => boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    link: {
      /**
       * Set a link mark
       */
      setLink: (attributes: {
        href: string
        target?: string | null
      }) => ReturnType
      /**
       * Toggle a link mark
       */
      toggleLink: (attributes: {
        href: string
        target?: string | null
      }) => ReturnType
      /**
       * Unset a link mark
       */
      unsetLink: () => ReturnType
    }
  }
}

const hdPluginKey = new PluginKey('hyperlinkPasting')

export const Link = Mark.create<LinkOptions>({
  name: 'link',

  priority: 1000,

  keepOnSplit: false,

  onCreate() {
    this.options.protocols.forEach((protocol) => {
      if (typeof protocol === 'string') {
        registerCustomProtocol(protocol)
        return
      }
      registerCustomProtocol(protocol.scheme, protocol.optionalSlashes)
    })
  },

  onDestroy() {
    reset()
  },

  // inclusive() {
  //   return this.options.autolink
  // },

  inclusive: false,
  // @ts-ignore
  onUpdate({editor, transaction}: {editor: Editor; transaction: Transaction}) {
    let link = editor.getAttributes('link')

    if (!link.href) return true

    const addMarkStep: Step | undefined = transaction.steps.find(
      // @ts-ignore
      (step) => step.jsonID === 'addMark',
    )

    if (!addMarkStep) return true

    toast.success('link updated. detected')
    transaction.setMeta(hdPluginKey, link.href)
    // editor.view.dispatch(transaction)
    // setTimeout(() => {
    //   toast.success('trying to upgrade link to hd://')

    //   console.log(
    //     '🚀 ~ file: link.ts:113 ~ setTimeout ~ addMarkStep:',
    //     addMarkStep,
    //   )

    //   editor
    //     .chain()
    //     .focus()
    //     .extendMarkRange('link')

    //     // .unsetLink()
    //     .setLink({href: 'hd://newfml'})
    //     .setMeta('preventAutolink', true)
    //     .run()
    //   // .setMark('link', {href: 'hd://fml', alt: 'demo alt'})
    //   // .setMeta('preventAutolink', true)

    //   return false
    // }, 1000)
  },

  addOptions() {
    return {
      openOnClick: true,
      linkOnPaste: true,
      autolink: true,
      protocols: [],
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: 'link',
      },
      validate: undefined,
    }
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: this.options.HTMLAttributes.target,
      },
      class: {
        default: this.options.HTMLAttributes.class,
      },
    }
  },

  parseHTML() {
    return [{tag: 'a[href]:not([href *= "javascript:" i])'}]
  },

  renderHTML({HTMLAttributes, mark}) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    const isHD = isHyperdocsScheme(HTMLAttributes.href)
    return [
      'span',
      {
        ...attrs,
        class: `${attrs.class} ${isHD ? 'hd-link' : ''}`,
      },
      0,
    ]
  },

  addCommands() {
    return {
      setLink:
        (attributes) =>
        ({chain}) => {
          return chain()
            .setMark(this.name, attributes)
            .setMeta('preventAutolink', true)
            .run()
        },

      toggleLink:
        (attributes) =>
        ({chain}) => {
          return chain()
            .toggleMark(this.name, attributes, {extendEmptyMarkRange: true})
            .setMeta('preventAutolink', true)
            .run()
        },

      unsetLink:
        () =>
        ({chain}) => {
          return chain()
            .unsetMark(this.name, {extendEmptyMarkRange: true})
            .setMeta('preventAutolink', true)
            .run()
        },
    }
  },

  addProseMirrorPlugins() {
    const plugins: Plugin[] = []

    if (this.options.autolink) {
      plugins.push(
        autolink({
          type: this.type,
          validate: this.options.validate,
        }),
      )
    }

    if (this.options.openOnClick) {
      plugins.push(
        clickHandler({
          type: this.type,
        }),
      )
    }

    plugins.push(
      pasteHandler({
        editor: this.editor,
        type: this.type,
        linkOnPaste: this.options.linkOnPaste,
      }),
    )

    plugins.push(hyperdocsLinkPlugin)

    return plugins
  },
})

// TODO: add proper types
const hyperdocsLinkPlugin: any = new Plugin({
  key: hdPluginKey,
  view(editorView) {
    return {
      update(view, prevState) {
        let state: {step: AddMarkStep | null} = hyperdocsLinkPlugin.getState(
          view.state,
        )

        if (!state) return false

        return checkHyperLink({
          view: view,
          step: state.step,
          dispatch: view.dispatch,
        })
      },
      destroy() {},
    }
  },
  state: {
    init() {
      return {step: null}
    },
    // @ts-expect-error
    apply(tr, value, oldState, newState) {
      if (tr.getMeta(hdPluginKey) == 'complete') {
        console.log('=== STOP!!')
        return {step: null}
      }
      if (newState.doc.eq(oldState.doc)) return value
      const addMarkStep = tr.steps.find(
        // @ts-ignore
        (step) => step.jsonID === 'addMark',
      )

      if (!addMarkStep) return value
      console.log(
        '🚀 ~ === link.ts:273 ~ apply ~ addMarkStep:',
        addMarkStep,
        value,
      )

      return {step: addMarkStep}
    },
  },
})

async function checkHyperLink({
  view,
  step,
  dispatch,
}: {
  view: EditorView
  step: AddMarkStep | null
  dispatch?: EditorView['dispatch']
}): Promise<boolean> {
  if (!step) return false

  let {href} = step.mark.attrs
  if (href) {
    let syncRes = isHyperdocsScheme(href) || isMintterGatewayLink(href)

    if (syncRes) {
      let [docId, versionId, blockId] = getIdsfromUrl(href)

      if (dispatch && docId) {
        let mark = view.state.schema.mark('link', {
          href: createHyperdocsDocLink(docId, versionId, blockId),
        })
        dispatch(
          view.state.tr
            .addMark(step.from, step.to, mark)
            .setMeta(hdPluginKey, 'complete'),
        )
        toast.success('link converted to permanent link!')
        return true
      }
    }

    let asyncRes = await fetchWebLink(href)

    if (asyncRes && asyncRes.documentId) {
      if (dispatch) {
        let mark = view.state.schema.mark('link', {
          href: createHyperdocsDocLink(
            asyncRes.documentId,
            asyncRes.documentVersion || undefined,
          ),
        })

        dispatch(
          view.state.tr
            .addMark(step.from, step.to, mark)
            .setMeta(hdPluginKey, 'complete'),
        )
        toast.success('link converted to permanent link!')
        return true
      }
    }
    console.log('🚀 ~ === checkHyperLink ~ NONE')
    return false
  } else {
    console.log('🚀 ~ === checkHyperLink ~ ELSE')
    return false
  }
}
