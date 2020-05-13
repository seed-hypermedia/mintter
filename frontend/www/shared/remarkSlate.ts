import {nodeTypes} from '@mintter/editor'
import extend from 'xtend'

export default function plugin(opts) {
  const settings = opts || {}
  this.Compiler = function compiler(node) {
    return node.children.map(c => transform(c, {}))
  }
}

export function transform(node, opts) {
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
