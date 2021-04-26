import { AutoformatRule, unwrapList } from '@udecode/slate-plugins';
import type { Editor } from 'slate';

// import {nodeTypes} from './nodeTypes'
import { MARK_BOLD } from './marks/bold';
import { MARK_CODE } from './marks/code';
import { MARK_ITALIC } from './marks/italic';
import { MARK_STRIKETHROUGH } from './marks/strikethrough';

export const preFormat = (editor: Editor) => unwrapList(editor);

export const autoformatRules: AutoformatRule[] = [
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
  // {
  //   trigger: '`',
  //   type: ELEMENT_CODE_BLOCK,
  //   markup: '``',
  //   mode: 'inline-block',
  //   preFormat: editor => unwrapList(editor),
  // },
];
