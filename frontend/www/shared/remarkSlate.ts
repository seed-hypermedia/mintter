import {Plugin, Settings, ProcessorSettings} from 'unified'
import {nodeTypes} from '@mintter/editor'
import {Node, Element, Text} from 'slate'
import extend from 'xtend'

export default function plugin(opts: Settings) {
  const settings = opts || {}
  this.Compiler = function compiler(node) {
    return node.children.map(c => transform(c, {}))
  }
}

// TODO: (horacio) Fixme types
export function transform(node: any, opts: Settings) {
  const settings = opts || {}

  let parentNode = node.parentNode || null
  let children = [{text: ''}]

  if (Array.isArray(node.children) && node.children.length > 0) {
    children = node.children.map(function(c) {
      return transform(
        extend(c, {
          parentNode: node,
          ordered: node.ordered || false,
        }),
        settings,
      )
    })
  }

  switch (node.type) {
    // case 'image':
    //   return {
    //     type: 'img',
    //     url: node.url,
    //     caption: node.alt,
    //     chldren: children,
    //   }
    case 'heading':
      return {
        type: depthToHeading[node.depth],
        children: children,
      }
    case 'list':
      return {
        type: node.ordered ? nodeTypes.typeOl : nodeTypes.typeUl,
        children: children,
      }
    case 'listItem':
      return {
        type: nodeTypes.typeLi,
        children: children,
      }
    case 'emphasis':
      return extend(forceLeafNode(children), {italic: true})
    case 'strong':
      return extend(forceLeafNode(children), {bold: true})
    case 'delete':
      return extend(forceLeafNode(children), {strikeThrough: true})
    case 'paragraph':
      return {
        type: nodeTypes.typeP,
        children: children,
      }
    case 'link':
      return {
        type: nodeTypes.typeLink,
        link: node.url,
        children: children,
      }
    case 'blockquote':
      return {
        type: nodeTypes.typeBlockquote,
        children: children,
      }

    case 'html':
      if (node.value === '<br>') {
        return {
          type: nodeTypes.typeP,
          children: [{text: ''}],
        }
      }
      break
    case 'inlineCode':
      return {
        text: node.value,
        code: true,
      }

    case 'code':
      return {
        type: node.type,
        lang: node.lang,
        meta: node.meta,
        children: [
          {
            text: node.value,
          },
        ],
      }
    case 'text':
    default:
      return {
        text: node.value || '',
      }
  }
}

function forceLeafNode(children) {
  return {text: children.map(k => k.text).join('')}
}

const depthToHeading = {
  1: nodeTypes.typeH1,
  2: nodeTypes.typeH2,
  3: nodeTypes.typeH3,
}
