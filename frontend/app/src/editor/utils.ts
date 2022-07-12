import type {GroupingContent} from '@mintter/mttast'
import {
  FlowContent,
  group,
  isFlowContent,
  isGroup,
  isGroupContent,
  isStatement,
  Statement,
  statement,
} from '@mintter/mttast'
import videoParser from 'js-video-url-parser'
import {useMemo} from 'react'
import type {Ancestor, Descendant, NodeEntry, Point, Span} from 'slate'
import {Editor, Node, Path, Range, Text, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

export const isCollapsed = (range: Range): boolean =>
  !!range && Range.isCollapsed(range)

export interface UnhangRangeOptions {
  at?: Range | Path | Point | Span
  voids?: boolean
  unhang?: boolean
}
/**
 * unhangRange:
 *
 * sometimes selections starts at the very start or end of other nodes.
 * this causes some troubles when transforming nodes.
 * `unhangRange` removes the remaining selection portion of a node in the selection.
 *
 * "Generally speaking, when the hanging option is false, the range will be trimmed so it doesn’t hang over a node boundary".
 * 
 * so if you have (in slate-hyperscript syntax):
 
* ```
 * <editor>
 *  <block>
 *    <anchor/>
 *    foo
 *  </block>
 *  <block>
 *    <focus/>
 *    bar
 *  </block>
 * </editor>
 * ```
 *
 * and you unhang the selection, you get
 *
 * ```
 * <editor>
 *  <block>
 *    <anchor/>
 *    foo
 *    <focus/>
 *  </block>
 *  <block>
 *    bar
 *  </block>
 * </editor>
 * ```
 *
 * so the selection isn’t hanging into the second block.
 *
 * */
export function unhangRange(editor: Editor, options: UnhangRangeOptions = {}) {
  const {at = editor.selection, voids, unhang = true} = options

  if (Range.isRange(at) && unhang) {
    options.at = Editor.unhangRange(editor, at, {voids})
  }
}

/**
 *
 * @param entry NodeEntry<Ancestor>
 * @returns Path
 *
 * This is important when normalizing groups if they are the last child of a node or not. that way we can do the appropiate transformations
 */
export function getLastChildPath(entry: NodeEntry<Ancestor>): Path {
  const lastChild = getLastChild(entry)
  if (!lastChild) return entry[1].concat([-1])

  return lastChild[1]
}

/**
 *
 * @param entry NodeEntry<Ancestor>
 * @returns NodeEntry<Descendant>
 *
 * we need to check the type of the last child of a statement to know where to move the new statement created.
 */
export function getLastChild(
  entry: NodeEntry<Ancestor>,
): NodeEntry<Descendant> | null {
  const [node, path] = entry
  if (!node.children.length) return null
  return [
    node.children[node.children.length - 1],
    path.concat([node.children.length - 1]),
  ]
}

/**
 *
 * @param parentEntry
 * @param childPath
 * @returns boolean
 *
 * before we check the last child type, we need to make sure the current statement path is not the last child. that way we are certain that the last child should be a group.
 */
export function isLastChild(
  parentEntry: NodeEntry<Ancestor>,
  childPath: Path,
): boolean {
  const lastChildPath = getLastChildPath(parentEntry)

  return Path.equals(lastChildPath, childPath)
}

export function isFirstChild(path: Path): boolean {
  return path[path.length - 1] == 0
}

export function toggleMark(
  editor: Editor,
  key: string,
  value = true, // TODO: if key == 'color', value is a string
  // ...clears: Array<keyof Omit<Text, 'value'>>
): void {
  if (!editor.selection) return

  const isActive = isMarkActive(editor, key)

  Transforms.setNodes(
    editor,
    {
      [key]: isActive ? null : value,
    },
    {
      match: Text.isText,
      split: true,
    },
  )
}

export function isMarkActive(editor: Editor, key: string): boolean {
  const [match] = Editor.nodes(editor, {
    match: (n) => !!n[key],
    mode: 'all',
  })

  return !!match
}

export function resetFlowContent(editor: Editor): boolean | undefined {
  const {selection} = editor
  if (selection && isCollapsed(selection)) {
    const block = Editor.above<Statement>(editor, {
      match: (n) => isFlowContent(n) && !isStatement(n),
    })

    if (block) {
      const [node, path] = block

      if (!Node.string(node.children[0])) {
        Editor.withoutNormalizing(editor, () => {
          Transforms.insertNodes(
            editor,
            statement({id: node.id}, node.children),
            {
              at: Path.next(path),
            },
          )
          Transforms.removeNodes(editor, {at: path})
          Transforms.select(editor, path.concat(0))
        })
        return true
      }
    }
    return false
  }
}

export function resetGroupingContent(editor: Editor): boolean {
  // const {selection} = editor
  // if (selection && isCollapsed(selection)) {
  const list = Editor.above<GroupingContent>(editor, {
    match: (n) => isGroupContent(n) && !isGroup(n),
  })

  if (list) {
    const [listNode, listPath] = list
    if (!Node.string(listNode)) {
      Editor.withoutNormalizing(editor, () => {
        Transforms.insertNodes(editor, group(listNode.children), {
          at: Path.next(listPath),
        })
        Transforms.removeNodes(editor, {at: listPath})
        Transforms.select(editor, listPath.concat(0))
      })
      return true
    }
  }
  // }
  return false
}

export function findPath(node: Node): Path {
  // `ReactEditor.findPath` does nto use the editor param for anything. it's there because of API consistency reasons I guess? 🤷🏼‍♂️
  // @ts-ignore
  return ReactEditor.findPath(null, node)
}

type GetBlockOptions = Omit<
  Parameters<typeof Editor.nodes>[1] & {
    id?: string
  },
  'match'
>

export function getEditorBlock(
  editor: Editor,
  options: GetBlockOptions,
): NodeEntry<FlowContent> | undefined {
  let [match] = Editor.nodes<FlowContent>(editor, {
    ...options,
    reverse: true,
    mode: 'lowest',
    match: (n) => matcher(n, options.id),
    at: options.at ?? [],
  })

  return match

  function matcher(n: Node, id?: FlowContent['id']): boolean {
    if (id) {
      return isFlowContent(n) && n.id == id
    } else {
      return isFlowContent(n)
    }
  }
}

export function isValidUrl(url: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    try {
      let imageUrl = new URL(url)
      resolve(imageUrl.toString())
    } catch (e) {
      reject(`IMAGE: Error: Invalid Image Url: ${url}`)
    }
  })
}

// const twitterRegex =
//   /^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(?<id>\d+)/

// export const parseTwitterUrl = (url: string): EmbedUrlData | undefined => {
//   if (url.match(twitterRegex)) {
//     return {
//       provider: 'twitter',
//       id: twitterRegex.exec(url)?.groups?.id,
//       url,
//     }
//   }
// }

export type EmbedUrlData = {
  url?: string
  provider?: 'youtube' | 'vimeo'
  id?: string
}

export const parseEmbedUrl = (url: string): EmbedUrlData => {
  // const twitterData = parseTwitterUrl(url)
  // if (twitterData) return twitterData

  const videoData = parseVideoUrl(url)
  if (videoData) return videoData

  return {}
}

const YOUTUBE_PREFIX = 'https://www.youtube.com/embed/'
const VIMEO_PREFIX = 'https://player.vimeo.com/video/'
// const DAILYMOTION_PREFIX = 'https://www.dailymotion.com/embed/video/';
// const YOUKU_PREFIX = 'https://player.youku.com/embed/';
// const COUB_PREFIX = 'https://coub.com/embed/';

export const parseVideoUrl = (url: string) => {
  const videoData = videoParser.parse(url)
  if (videoData?.provider && videoData.id) {
    const {id, provider} = videoData

    const providerUrls: Record<string, string> = {
      youtube: `${YOUTUBE_PREFIX}${id}`,
      vimeo: `${VIMEO_PREFIX}${id}`,
      // dailymotion: `${DAILYMOTION_PREFIX}${id}`,
      // youku: `${YOUKU_PREFIX}${id}`,
      // coub: `${COUB_PREFIX}${id}`,
    }

    return {
      id,
      provider,
      url: providerUrls[provider],
    } as EmbedUrlData
  }
}

export function useParentGroup(editor: Editor, path: Path) {
  return useMemo(() => {
    const entry = Editor.above(editor, {
      at: path,
      match: isGroupContent,
    })

    if (entry) {
      return entry[0].type || 'group'
    }
  }, [path])
}
