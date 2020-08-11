import {nodeTypes} from '@mintter/editor'
import {Node, Element} from 'slate'
import {Section} from '@mintter/proto/documents_pb'

export interface SlateSection extends Omit<Element, 'children'> {
  id: string
  type?: string
  title?: string
  description?: string
  children: Node[]
}

export function fromSlateToMarkdown(slateTree: SlateSection[]): Section[] {
  const newSections = slateTree.map((s: SlateSection) => {
    const {children, title = '', description = ''} = s
    const n = new Section()
    n.setDocumentId(s.id)
    n.setTitle(title)
    n.setDescription(description)
    if (s.type === 'img') {
      n.setBody(`![${s.caption ?? 'image'}](${s.url})`)
    } else {
      n.setBody(
        children
          .map(n => parseToMarkdown(n))
          .join(''),
      )
    }

    return n
  })
  return newSections
}

const LIST_TYPES = [nodeTypes.typeUl, nodeTypes.typeOl]

interface LeafType {
  text: string
  strikeThrough?: boolean
  bold?: boolean
  italic?: boolean
}

interface BlockType {
  type: string
  parentType?: string
  link?: string
  children: Array<BlockType | LeafType>
}

interface ParseToMarkdownOptions {
  ignoreParagraphNewline?: boolean
  listDepth?: number
}

export function parseToMarkdown(node, options: ParseToMarkdownOptions = {}) {
  const {ignoreParagraphNewline = false, listDepth = 0} = options

  let {text = '', type = ''} = node
  console.log('toSlate: parseToMarkdown -> node', node)

  let children = type
    ? node.children
        .map(n => {
          const isList = LIST_TYPES.includes(n.type || '')
          const selfIsList = LIST_TYPES.includes(node.type || '')
          const childHasLink =
            Array.isArray(node.children) &&
            node.children.some(l => l.type && l.type === nodeTypes.typeLink)

          return parseToMarkdown(
            {...n, parentType: type},
            {
              ignoreParagraphNewline:
                ignoreParagraphNewline || isList || selfIsList || childHasLink,
              listDepth: LIST_TYPES.includes(n.type || '')
                ? listDepth + 1
                : listDepth,
            },
          )
        })
        .join('')
    : text

  if (!ignoreParagraphNewline && node.text === '' && node.parentType === 'p') {
    type = 'p'
    children = '<br>'
  }

  if (children === '') return

  if (node.bold) {
    children = retainWhitespaceAndFormat(children, '**')
  }

  if (node.italic) {
    children = retainWhitespaceAndFormat(children, '_')
  }

  if (node.strikeThrough) {
    children = `~~${children}~~`
  }

  if (node.code) {
    children = `\`${children}\``
  }

  switch (type) {
    case nodeTypes.typeH1:
      return `# ${children}\n`
    case nodeTypes.typeH2:
      return `## ${children}\n`
    case nodeTypes.typeH3:
      return `### ${children}\n`
    case nodeTypes.typeBlockquote:
      // For some reason, marked is parsing blockquotes w/ one new line
      // as contiued blockquotes, so adding two new lines ensures that doesn't
      // happen
      return `> ${children}\n\n`
    case nodeTypes.typeLink:
      return `[${children}](${node.url || ''})`
    case nodeTypes.typeUl:
    case nodeTypes.typeOl:
      return `\n${children}\n`
    case nodeTypes.typeLi: {
      const isOL = node && node.parentType === nodeTypes.typeOl

      let spacer = ''
      for (let k = 0; listDepth > k; k++) {
        if (isOL) {
          // https://github.com/remarkjs/remark-react/issues/65
          spacer += '   '
        } else {
          spacer += '  '
        }
      }
      return `${spacer}${isOL ? '1.' : '-'} ${children}\n`
    }
    case 'img':
      console.log('toSlate: parse2MD type switch!!')
      return `\n\n![${node.caption ?? 'image'}](${node.utl})\n\n`
    case 'code':
      return `\n\`\`\`\n${children}\n\`\`\`\n\n`
    case 'p':
      return `${children}\n`
    default:
      return children
  }
}

// This function handles the case of a string like this: "   foo   "
// Where it would be invalid markdown to generate this: "**   foo   **"
// We instead, want to trim the whitespace out, apply formatting, and then
// bring the whitespace back. So our returned string looks like this: "   **foo**   "
function retainWhitespaceAndFormat(string, format) {
  const left = string.trimLeft()
  const right = string.trimRight()
  let children = string.trim()

  const fullFormat = `${format}${children}${format}`

  if (children.length === string.length) {
    return fullFormat
  }

  const leftFormat = `${format}${children}`

  if (left.length !== string.length) {
    const diff = string.length - left.length
    children = `${new Array(diff + 1).join(' ')}${leftFormat}`
  } else {
    children = leftFormat
  }

  const rightFormat = `${children}${format}`

  if (right.length !== string.length) {
    const diff = string.length - right.length
    children = `${rightFormat}${new Array(diff + 1).join(' ')}`
  } else {
    children = rightFormat
  }

  return children
}
