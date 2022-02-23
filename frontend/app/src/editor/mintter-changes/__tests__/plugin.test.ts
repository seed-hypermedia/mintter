import { paragraph, statement, Statement, text } from '@mintter/mttast'
import { NodeEntry } from 'slate'
import { describe, expect, it } from 'vitest'
import { changesService, CHANGES_ADD_BLOCK } from '../plugin'

describe('Mark blocks as dirty', () => {
  it('add new block', (done) => {
    let entry: NodeEntry<Statement> = [
      statement([paragraph([text('hello')])]), [0, 0]
    ]
    let expected = [
      entry
    ]

    changesService.onTransition(state => {
      setTimeout(() => {
        done()
      }, 150);


    })

    changesService.start()
    changesService.send({ type: CHANGES_ADD_BLOCK, block: entry })

    expect(changesService.getSnapshot().context.blocks).toEqual(expected)
  })

  it('move block', (done) => {
    let entry1: NodeEntry<Statement> = [
      statement([paragraph([text('hello')])]), [0, 0]
    ]
    let entry2: NodeEntry<Statement> = [
      statement([paragraph([text('hello')])]), [0, 0, 1, 0]
    ]
    let expected = [
      entry2
    ]

    changesService.onTransition(state => {
      setTimeout(() => {
        done()
      }, 150);


    })

    changesService.start()
    changesService.send({ type: CHANGES_ADD_BLOCK, block: entry1 })
    changesService.send({ type: CHANGES_ADD_BLOCK, block: entry2 })

    expect(changesService.getSnapshot().context.blocks).toEqual(expected)
  })
})

describe('create document changes', () => {

})