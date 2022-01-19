import {describe, expect, test} from 'vitest'

function sum(a: number, b: number) {
  return a + b
}
describe('demo unit test', () => {
  test('should work!', () => {
    expect(sum(1, 1)).toEqual(2)
  })
})
