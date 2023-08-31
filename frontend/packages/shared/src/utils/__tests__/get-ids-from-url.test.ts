import {
  extractHypermediaWebsiteValues,
  getIdsfromUrl,
  matchesHypermediaPattern,
} from '../get-ids-from-url'
import {describe, expect, it, test} from 'vitest'

const testCases: Array<[string, boolean]> = [
  ['https://mintter.com/d/foo', true],
  ['https://www.mintter.com/d/foo', true],
  ['https://mintter.com/d/foo?v=bar', true],
  ['https://mintter.com/d/foo?v=bar#block', true],
  ['https://www.mintter.com/d/foo?v=bar#block', true],
  ['https://gabo.es/d/anotherpath', true],
  ['https://gabo.es/d/anotherpath?v=versionhere', true],
  ['https://gabo.es/d/anotherpath?v=bar#block', true],
  ['https://www.hhg.link/g/somegroupid', true],
  ['https://juligasa.es/a/accountid', true],
  ['https://example.com/invalid', false],
  ['http://example.com/a/shouldbeinvalid', false],
]

describe('matchesHypermediaPattern', () => {
  test.each(testCases)('should match valid URLs', (url, expected) => {
    expect(matchesHypermediaPattern(url)).toBe(expected)
  })
})

describe('extractHypermediaWebsiteValues', () => {
  it('should extract values from valid URLs', () => {
    const values = extractHypermediaWebsiteValues(
      'https://mintter.com/d/foo?v=bar#block',
    )
    expect(values).toEqual({
      hostname: 'mintter.com',
      pathType: 'd',
      docId: 'foo',
      version: 'bar',
      blockId: 'block',
    })
    // Add more test cases here
  })

  it('should return null for invalid URLs', () => {
    const values = extractHypermediaWebsiteValues('https://example.com/invalid')
    expect(values).toBeNull()
    // Add more test cases here
  })
})

describe('getIdsfromUrl', () => {
  it('should return values from matching URLs', () => {
    const result = getIdsfromUrl('https://mintter.com/d/foo?v=bar#block')
    expect(result).toEqual(['foo', 'bar', 'block'])
    // Add more test cases here
  })

  it('should handle URLs without version and blockId', () => {
    const result = getIdsfromUrl('https://gabo.es/d/anotherpath')
    expect(result).toEqual(['anotherpath', undefined, undefined])
    // Add more test cases here
  })

  it('should handle Fully Qualified IDs', () => {
    const result = getIdsfromUrl('hd://d/abc123')
    expect(result).toEqual(['abc123', undefined, undefined])
    // Add more test cases here
  })

  it('should handle invalid entries', () => {
    const result = getIdsfromUrl('https://example.com/invalid')
    expect(result).toEqual([undefined, undefined, undefined])
    // Add more test cases here
  })
})
