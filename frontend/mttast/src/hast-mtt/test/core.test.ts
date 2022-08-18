import {h} from 'hastscript'
import {u} from 'unist-builder'
import {visit} from 'unist-util-visit'
import {describe, expect, test} from 'vitest'
import {toMttast} from '..'
import {Statement, text} from '../..'

describe('core', () => {
  test('should transform hast to mttast', () => {
    const hast = u('root', [h('strong', 'hello world')])
    const expected = u('root', [text('hello world', {strong: true})])
    const result = toMttast(hast)

    expect(result).toEqual(expected)
  })

  test('should transform a node w/o mttast representation to an empty root', () => {
    const hast = u('doctype', {name: 'html'})
    const expected = u('root', [])
    const result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  // test('should transform a node w/o multiple representations to a root', () => {})

  test('should transform unknown texts to `text`', () => {
    const hast = u('root', [u('unknown', 'text')])
    const expected = u('root', [text('text')])
    // @ts-ignore
    const result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should unwrap unknown parents', () => {
    const hast = u('root', [u('unknown', [h('strong', 'hello')])])
    const expected = u('root', [text('hello', {strong: true})])
    // @ts-ignore
    const result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should ignore unknown voids', () => {
    const hast = u('root', [u('unknown')])
    const expected = u('root', [])
    // @ts-ignore
    const result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should not generate two equal Ids', () => {
    const hast = u('root', [
      h('ul', [
        h('li', [h('p', [h('span', 'hello one')])]),
        h('li', [h('p', [h('span', 'hello two')])]),
        h('li', [h('p', [h('span', 'hello three')])]),
      ]),
      h('p', [h('span', 'Foo.')]),
      h('ul', [
        h('li', [h('p', [h('span', 'hello foo')])]),
        h('li', [h('p', [h('span', 'hello bar')])]),
        h('li', [h('p', [h('span', 'hello baz')])]),
      ]),
    ])

    const allWithIds: Array<unknown> = []
    const result = toMttast(hast)
    visit(result, 'statement', (node: Statement) => {
      allWithIds.push({id: node.id})
    })

    const set = [...new Set(allWithIds)]

    expect(allWithIds.length).toEqual(set.length)
  })
})
