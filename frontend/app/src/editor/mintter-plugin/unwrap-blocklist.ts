import {Editor, Transforms} from 'slate'
// import {unwrapNodesByType} from '@udecode/slate-plugins'

export const unwrapBlockList = (editor: Editor, options?: any) => {
  const {block, block_list} = options
  console.log('calling the unwrapper!')

  Transforms.unwrapNodes(editor, {
    match: n => [block.type].includes(n.type as string),
  })
  Transforms.unwrapNodes(editor, {
    match: n => [block_list.type].includes(n.type as string),
    split: true,
  })
}
