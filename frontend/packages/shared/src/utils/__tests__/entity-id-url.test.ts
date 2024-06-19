import { describe, expect, it, test } from 'vitest'
import {
    createHmId,
    parseCustomURL,
    unpackDocId,
    unpackHmId,
} from '../entity-id-url'

describe('unpackHmId', () => {
  test('unpacks hm://d/abc', () => {
    expect(unpackHmId('hm://d/abc')).toEqual({
      id: 'hm://d/abc',
      qid: 'hm://d/abc',
      scheme: 'hm',
      hostname: null,
      type: 'd',
      eid: 'abc',
      version: undefined,
      blockRef: null,
      indexPath: null,
    })
  })
  test('unpacks hm://g/abc?v=123#foo', () => {
    expect(unpackHmId('hm://g/abc?v=123#foo')).toEqual({
      id: 'hm://g/abc?v=123#foo',
      qid: 'hm://g/abc',
      scheme: 'hm',
      hostname: null,
      type: 'g',
      eid: 'abc',
      version: '123',
      blockRef: 'foo',
      indexPath: null,
    })
  })
  test('unpacks hm://d/foo#bar', () => {
    expect(unpackHmId('hm://d/foo#bar')).toEqual({
      id: 'hm://d/foo#bar',
      qid: 'hm://d/foo',
      scheme: 'hm',
      hostname: null,
      type: 'd',
      eid: 'foo',
      version: undefined,
      blockRef: 'bar',
      indexPath: null,
    })
  })
  test('unpacks hm://a/foo?v=bar', () => {
    expect(unpackHmId('hm://a/foo?v=bar')).toEqual({
      id: 'hm://a/foo?v=bar',
      qid: 'hm://a/foo',
      scheme: 'hm',
      hostname: null,
      type: 'a',
      eid: 'foo',
      version: 'bar',
      blockRef: null,
      indexPath: null,
    })
  })
  test('unpacks https://foobar.com/d/1?v=2', () => {
    expect(unpackHmId('https://foobar.com/d/1?v=2')).toEqual({
      scheme: 'https',
      hostname: 'foobar.com',
      type: 'd',
      eid: '1',
      version: '2',
      blockRef: null,
      id: 'https://foobar.com/d/1?v=2',
      qid: 'hm://d/1',
      indexPath: null,
    })
  })
  test('unpacks http://foobar.com/a/1#block', () => {
    expect(unpackHmId('http://foobar.com/a/1#block')).toEqual({
      scheme: 'http',
      hostname: 'foobar.com',
      type: 'a',
      eid: '1',
      version: undefined,
      blockRef: 'block',
      id: 'http://foobar.com/a/1#block',
      qid: 'hm://a/1',
      indexPath: null,
    })
  })
})
describe('parseCustomURL', () => {
  test('parseCustomURL hm://a/b?foo=1=&bar=2#block', () => {
    expect(parseCustomURL('hm://a/b?foo=1=&bar=2#block')).toEqual({
      scheme: 'hm',
      path: ['a', 'b'],
      query: {foo: '1', bar: '2'},
      fragment: 'block',
    })
  })
})
describe('createHmId', () => {
  test('creates hm://d/abc', () => {
    expect(createHmId('d', 'abc')).toEqual('hm://d/abc')
  })
  test('creates hm://g/123?v=foo', () => {
    expect(createHmId('g', '123', {version: 'foo'})).toEqual('hm://g/123?v=foo')
  })
  test('creates hm://d/123#block', () => {
    expect(createHmId('d', '123', {blockRef: 'block'})).toEqual(
      'hm://d/123#block',
    )
  })
  test('creates hm://a/123?v=foo#bar', () => {
    expect(createHmId('a', '123', {version: 'foo', blockRef: 'bar'})).toEqual(
      'hm://a/123?v=foo#bar',
    )
  })
})

describe('unpackDocId', () => {
  it('should return values from matching URLs', () => {
    const result = unpackDocId('https://hyper.xyz/d/foo?v=bar#block')
    expect(result).toEqual({
      docId: 'hm://d/foo',
      eid: 'foo',
      hostname: 'hyper.xyz',
      scheme: 'https',
      type: 'd',
      version: 'bar',
      blockRef: 'block',
      id: 'https://hyper.xyz/d/foo?v=bar#block',
    })
  })

  it('should handle URLs without version and blockId', () => {
    const result = unpackDocId('http://gabo.es/d/anotherpath')
    expect(result).toEqual({
      docId: 'hm://d/anotherpath',
      eid: 'anotherpath',
      hostname: 'gabo.es',
      scheme: 'http',
      type: 'd',
      version: undefined,
      blockRef: null,
      id: 'http://gabo.es/d/anotherpath',
    })
  })

  it('should handle Fully Qualified IDs', () => {
    const result = unpackDocId('hm://d/abc123')
    expect(result).toEqual({
      docId: 'hm://d/abc123',
      eid: 'abc123',
      hostname: null,
      id: 'hm://d/abc123',
      scheme: 'hm',
      type: 'd',
      version: undefined,
      blockRef: null,
    })
  })
})
