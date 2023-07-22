import {fetchWebLink} from '@app/models/web-links'
import {AppQueryClient} from '@mintter/app/src/query-client'
import {
  createHyperdocsDocLink,
  isHyperdocsScheme,
  isMintterGatewayLink,
  normalizeHyperdocsLink,
} from '@mintter/shared'
import {Editor} from '@tiptap/core'
import {Mark, MarkType} from '@tiptap/pm/model'
import {EditorState, Plugin, PluginKey} from '@tiptap/pm/state'
import {Decoration, DecorationSet} from '@tiptap/pm/view'
import {find} from 'linkifyjs'
import {nanoid} from 'nanoid'

type PasteHandlerOptions = {
  client: AppQueryClient
  editor: Editor
  type: MarkType
  linkOnPaste?: boolean
}

export function pasteHandler(options: PasteHandlerOptions): Plugin {
  let pastePlugin = new Plugin({
    key: new PluginKey('handlePasteLink'),
    state: {
      init() {
        return DecorationSet.empty
      },
      apply(tr, set) {
        // Adjust decoration positions to changes made by the transaction
        set = set.map(tr.mapping, tr.doc)
        // See if the transaction adds or removes any placeholders
        let action = tr.getMeta('link-placeholder')
        if (action && action.add) {
          let widget = document.createElement('span')
          widget.contentEditable = 'false'
          widget.classList.add('link-placeholder')
          let deco = Decoration.widget(action.add.pos, widget, {
            link: action.add.link,
          })
          set = set.add(tr.doc, [deco])
        } else if (action && action.remove) {
          set = set.remove(
            set.find(
              // @ts-expect-error
              null,
              null,
              (spec) => spec.link.href == action.remove.link.href,
            ),
          )
        }
        return set
      },
    },
    props: {
      decorations(state) {
        return this.getState(state)
      },
      handlePaste: (view, event, slice) => {
        const {state} = view
        const {selection} = state

        // Do not proceed if in code block.
        if (state.doc.resolve(selection.from).parent.type.spec.code) {
          return false
        }

        const pastedLinkMarks: Mark[] = []
        let textContent = ''

        slice.content.forEach((node) => {
          textContent += node.textContent

          node.marks.forEach((mark) => {
            if (mark.type.name === options.type.name) {
              pastedLinkMarks.push(mark)
            }
          })
        })

        const hasPastedLink = pastedLinkMarks.length > 0
        const link = find(textContent).find(
          (item) => item.isLink && item.value === textContent,
        )

        const nativeHyperLink =
          isHyperdocsScheme(textContent) || isMintterGatewayLink(textContent)
            ? normalizeHyperdocsLink(textContent)
            : null

        if (!selection.empty && options.linkOnPaste) {
          const pastedLink =
            nativeHyperLink ||
            (hasPastedLink ? pastedLinkMarks[0].attrs.href : link?.href || null)
          if (pastedLink) {
            if (nativeHyperLink) {
              options.editor
                .chain()
                .setMark(options.type, {
                  href: pastedLink,
                })
                .run()
            } else {
              let id = nanoid(8)
              options.editor
                .chain()
                .command(({tr}) => {
                  tr.setMeta('hdPlugin:uncheckedLink', id)
                  return true
                })
                .setMark(options.type, {
                  href: pastedLink,
                  id,
                })
                .run()
            }

            return true
          }
        }

        const firstChildIsText = slice.content.firstChild?.type.name === 'text'
        const firstChildContainsLinkMark = slice.content.firstChild?.marks.some(
          (mark) => mark.type.name === options.type.name,
        )

        if (firstChildIsText && firstChildContainsLinkMark) {
          return false
        }

        // if (nativeHyperLink && selection.empty) {
        //   const placeholder = '...'
        //   options.editor.commands.insertContent(
        //     // we annotate with data-fresh so the link will async load the title
        //     `<a href="${nativeHyperLink}">${placeholder}</a>`,
        //   )

        //   let currentBlock = findBlock(selection)
        //   if (currentBlock) {
        //     console.log('PASTE BLOCK HERE', currentBlock, options.editor)
        //     // insertBlocks(
        //     //   [
        //     //     {
        //     //       type: 'embed',
        //     //       ref: nativeHyperLink,
        //     //     },
        //     //   ],
        //     //   currentBlock.node.attrs.id,
        //     //   'after',
        //     //   options.editor,
        //     // )
        //   }

        //   // const {$from, $to} = selection
        //   // const schema = view.state.schema
        //   // setTimeout(() => {
        //   //   if ($from.sameParent($to) && $from.parent.isTextblock) {
        //   //     const tr = view.state.tr
        //   //     tr.replaceWith(
        //   //       $from.pos,
        //   //       $to.pos + placeholder.length,
        //   //       schema.text('doc title', [
        //   //         schema.marks.link.create({href: nativeHyperLink}),
        //   //       ]),
        //   //     )
        //   //     view.dispatch(tr)
        //   //   }
        //   // }, 1000)

        //   return true
        // }

        if (link && selection.empty) {
          // TODO: insert a link placeholder here
          let tr = view.state.tr
          if (!tr.selection.empty) tr.deleteSelection()
          tr.setMeta('link-placeholder', {
            add: {link, pos: tr.selection.from},
          })
          view.dispatch(tr)
          // options.editor.commands.insertContent(
          //   `<a href="${link.href}">${link.href}</a>`,
          // )

          fetchWebLink(options.client, link.href)
            .then((res) => {
              let tr = view.state.tr
              let pos = findPlaceholder(view.state, link.href)
              if (!pos) return null
              let href =
                res && res.documentId
                  ? createHyperdocsDocLink(
                      res.documentId,
                      res.documentVersion,
                      res.blockId,
                    )
                  : link.href

              view.dispatch(
                tr
                  .insertText(link.href, pos)
                  .addMark(
                    pos,
                    pos + link.href.length,
                    options.editor.schema.mark('link', {
                      href,
                    }),
                  )
                  .setMeta('link-placeholder', {remove: {link}}),
              )
            })
            .catch((err) => {
              let tr = view.state.tr
              let pos = findPlaceholder(view.state, link.href)
              if (!pos) return null
              view.dispatch(
                tr
                  .insertText(link.href, pos)
                  .addMark(
                    pos,
                    pos + link.href.length,
                    options.editor.schema.mark('link', {
                      href: link.href,
                    }),
                  )
                  .setMeta('link-placeholder', {remove: {link}}),
              )
            })

          return true
        }

        const {tr} = state
        let deleteOnly = false

        if (!selection.empty) {
          deleteOnly = true

          tr.delete(selection.from, selection.to)
        }

        let currentPos = selection.from
        let fragmentLinks = []

        slice.content.forEach((node) => {
          fragmentLinks = find(node.textContent)

          tr.insert(currentPos - 1, node)

          if (fragmentLinks.length > 0) {
            deleteOnly = false

            fragmentLinks.forEach((fragmentLink) => {
              const linkStart = currentPos + fragmentLink.start
              const linkEnd = currentPos + fragmentLink.end
              const hasMark = tr.doc.rangeHasMark(
                linkStart,
                linkEnd,
                options.type,
              )

              if (!hasMark) {
                let id = nanoid(8)
                tr.addMark(
                  linkStart,
                  linkEnd,
                  options.type.create({href: fragmentLink.href, id}),
                ).setMeta('hdPlugin:uncheckedLink', id)
              }
            })
          }
          currentPos += node.nodeSize
        })

        const hasFragmentLinks = fragmentLinks.length > 0

        if (tr.docChanged && !deleteOnly && hasFragmentLinks) {
          options.editor.view.dispatch(tr)

          return true
        }

        return false
      },
    },
  })

  function findPlaceholder(state: EditorState, url: string) {
    let decos = pastePlugin.getState(state)
    if (!decos) return null
    // @ts-expect-error
    let found = decos.find(null, null, (spec) => spec.link.href == url)
    return found.length ? found[0].from : null
  }

  return pastePlugin
}
