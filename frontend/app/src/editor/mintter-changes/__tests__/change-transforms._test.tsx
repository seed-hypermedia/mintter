/** @jsx jsx */
import {DocumentChange, blockToApi} from '@mintter/client'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {getEditorBlock} from '@app/editor/utils'
import {FlowContent} from '@mintter/mttast'
import {jsx} from '@app/test/jsx'
import {Editor} from 'slate'
import {beforeEach, describe, expect, test} from 'vitest'

console.log(jsx)
describe('Change Transforms', () => {
  let editor = (
    <editor>
      <group>
        <statement id="b1">
          <paragraph>
            <text>Paragraph 1</text>
          </paragraph>
        </statement>
        <statement id="b2">
          <paragraph>
            <text>Paragraph 2 (parent)</text>
          </paragraph>
          <group>
            <statement id="b2-1">
              <paragraph>
                <text>Paragraph Child 1</text>
              </paragraph>
            </statement>
            <statement id="b2-2">
              <paragraph>
                <text>Paragraph Child 2</text>
              </paragraph>
            </statement>
          </group>
        </statement>
      </group>
    </editor> /* eslint-disable-next-line */
  ) as any as Editor

  beforeEach(() => {
    MintterEditor.resetChanges(editor)
  })

  test('should deleteBlock (block should not exist in the editor', () => {
    MintterEditor.addChange(editor, ['deleteBlock', 'not-in-editor'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'deleteBlock',
          deleteBlock: 'not-in-editor',
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test('moveBlock', () => {
    MintterEditor.addChange(editor, ['moveBlock', 'b2'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'moveBlock',
          moveBlock: {
            blockId: 'b2',
            parent: '',
            leftSibling: 'b1',
          },
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test('replaceBlock', () => {
    MintterEditor.addChange(editor, ['replaceBlock', 'b1'])
    let blockEntry = getEditorBlock(editor, {id: 'b1'})
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'replaceBlock',
          replaceBlock: blockToApi(blockEntry?.[0] as FlowContent),
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test.skip('setTitle', () => {
    /**
     * TODO:
     * - we are adding the setTitle event manually, we need to check how to test this better
     */
    MintterEditor.addChange(editor, ['setTitle', 'new title'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'setTitle',
          setTitle: 'new title',
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })
  test('all together', () => {
    let blockEntry = getEditorBlock(editor, {id: 'b1'})
    MintterEditor.addChange(editor, ['replaceBlock', 'b1'])
    MintterEditor.addChange(editor, ['moveBlock', 'b2'])
    MintterEditor.addChange(editor, ['deleteBlock', 'not-in-editor'])

    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'replaceBlock',
          replaceBlock: blockToApi(blockEntry?.[0] as FlowContent),
        },
      },
      {
        op: {
          $case: 'moveBlock',
          moveBlock: {
            blockId: 'b2',
            parent: '',
            leftSibling: 'b1',
          },
        },
      },
      {
        op: {
          $case: 'deleteBlock',
          deleteBlock: 'not-in-editor',
        },
      },
    ]
    let res = MintterEditor.transformChanges(editor)
    expect(res).toStrictEqual(expected)
  })
})
