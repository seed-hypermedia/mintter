import {Statement} from '@mintter/mttast'
import {text} from '@mintter/mttast-builder'
import {h} from 'hastscript'
import {u} from 'unist-builder'
import {visit} from 'unist-util-visit'
import {toMttast} from '../src'

describe('core', () => {
  test('should transform hast to mttast', () => {
    let hast = u('root', [h('strong', 'hello world')])
    let expected = u('root', [text('hello world', {strong: true})])
    let result = toMttast(hast)

    expect(result).toEqual(expected)
  })

  test('should transform a node w/o mttast representation to an empty root', () => {
    let hast = u('doctype', {name: 'html'})
    let expected = u('root', [])
    let result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  // test('should transform a node w/o multiple representations to a root', () => {})

  test('should transform unknown texts to `text`', () => {
    let hast = u('root', [u('unknown', 'text')])
    let expected = u('root', [text('text')])
    // @ts-ignore
    let result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should unwrap unknown parents', () => {
    let hast = u('root', [u('unknown', [h('strong', 'hello')])])
    let expected = u('root', [text('hello', {strong: true})])
    // @ts-ignore
    let result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should ignore unknown voids', () => {
    let hast = u('root', [u('unknown')])
    let expected = u('root', [])
    // @ts-ignore
    let result = toMttast(hast)
    expect(result).toEqual(expected)
  })

  test('should not generate two equal Ids', () => {
    let hast = u('root', [
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

    let allWithIds: Array<any> = []
    let result = toMttast(hast)
    visit(result, 'statement', (node: Statement) => {
      allWithIds.push({id: node.id})
    })

    let set = [...new Set(allWithIds)]

    expect(allWithIds.length).toEqual(set.length)
  })
})
