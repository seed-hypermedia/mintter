import {Editor} from 'slate'
import {nodeTypes} from './nodeTypes'
import {
  AutoformatRule,
  unwrapList,
  toggleList,
  ELEMENT_CODE_BLOCK,
} from '@udecode/slate-plugins'
import {
  ELEMENT_H1,
  ELEMENT_H2,
  ELEMENT_H3,
  ELEMENT_BLOCKQUOTE,
} from './elements'
import {MARK_BOLD, MARK_ITALIC, MARK_CODE, MARK_STRIKETHROUGH} from './marks'

export const preFormat = (editor: Editor) => unwrapList(editor)

export const autoformatRules: AutoformatRule[] = [
  {
    type: ELEMENT_H1,
    markup: '#',
    preFormat,
  },
  {
    type: ELEMENT_H2,
    markup: '##',
    preFormat,
  },
  {
    type: ELEMENT_H3,
    markup: '###',
    preFormat,
  },
  {
    type: nodeTypes.typeLi,
    markup: ['*', '-', '+'],
    preFormat,
    format: editor => {
      toggleList(editor, {...nodeTypes, typeList: nodeTypes.typeUl})
    },
  },
  {
    type: nodeTypes.typeLi,
    markup: ['1.', '1)'],
    preFormat,
    format: editor => {
      toggleList(editor, {...nodeTypes, typeList: nodeTypes.typeOl})
    },
  },
  {
    type: ELEMENT_BLOCKQUOTE,
    markup: ['>'],
    preFormat,
  },
  {
    type: MARK_BOLD,
    between: ['**', '**'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_BOLD,
    between: ['__', '__'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_ITALIC,
    between: ['*', '*'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_ITALIC,
    between: ['_', '_'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_CODE,
    between: ['`', '`'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    type: MARK_STRIKETHROUGH,
    between: ['~~', '~~'],
    mode: 'inline',
    insertTrigger: true,
  },
  {
    trigger: '`',
    type: ELEMENT_CODE_BLOCK,
    markup: '``',
    mode: 'inline-block',
    preFormat: editor => unwrapList(editor),
  },
]
