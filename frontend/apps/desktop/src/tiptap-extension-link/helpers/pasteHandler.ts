import {
  isMintterGatewayLink,
  isMintterScheme,
  normalizeMintterLink,
} from '@app/utils/mintter-link'
import {HYPERDOCS_LINK_PREFIX} from '@mintter/shared'
import {Editor} from '@tiptap/core'
import {Mark, MarkType} from '@tiptap/pm/model'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {find} from 'linkifyjs'

type PasteHandlerOptions = {
  editor: Editor
  type: MarkType
  linkOnPaste?: boolean
}

export function pasteHandler(options: PasteHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handlePasteLink'),
    props: {
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
          isMintterScheme(textContent) || isMintterGatewayLink(textContent)
            ? normalizeMintterLink(textContent)
            : null

        if (!selection.empty && options.linkOnPaste) {
          const pastedLink =
            nativeHyperLink ||
            (hasPastedLink ? pastedLinkMarks[0].attrs.href : link?.href || null)

          if (pastedLink) {
            options.editor.commands.setMark(options.type, {href: pastedLink})

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

        if (nativeHyperLink && selection.empty) {
          options.editor.commands.insertContent(
            // we annotate with data-fresh so the link will async load the title
            `<a href="${nativeHyperLink}" data-fresh="1">...</a>`,
          )

          return true
        }

        if (link && selection.empty) {
          options.editor.commands.insertContent(
            `<a href="${link.href}">${link.href}</a>`,
          )

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
                tr.addMark(
                  linkStart,
                  linkEnd,
                  options.type.create({href: fragmentLink.href}),
                )
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
}
