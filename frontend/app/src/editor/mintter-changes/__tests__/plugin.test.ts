import { afterEach, describe, expect, it } from 'vitest'
import { ADD_BLOCK, changesService } from '../plugin'

describe('Mark blocks as dirty', () => {

  afterEach(() => {
    changesService.stop()
  })
  it('add new block', (done) => {

    let expected = { block: [0, 0] }

    changesService.onTransition(state => {
      setTimeout(() => {
        done()
      }, 150);
    })

    changesService.start()
    changesService.send({ type: ADD_BLOCK, id: 'block', path: [0, 0] })

    expect(changesService.getSnapshot().context.upsertBlocks).toEqual(expected)
  })

  it('move block', (done) => {

    let expected = {

      block1: [0, 0, 1, 0]
    }

    changesService.onTransition(state => {
      setTimeout(() => {
        done()
      }, 150);


    })
    changesService.start()
    changesService.send({ type: ADD_BLOCK, id: 'block1', path: [0, 0] })
    changesService.send({ type: ADD_BLOCK, id: 'block1', path: [0, 0, 1, 0] })

    expect(changesService.getSnapshot().context.upsertBlocks).toEqual(expected)
  })
})