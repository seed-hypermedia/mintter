import {reducer} from '../welcomeProvider'

describe('Welcome Provider', () => {
  test('should the reducer not delete current state when changing other branch', () => {
    const initialState = {seed: ['a', 'b', 'c']}
    const expected = {seed: ['a', 'b', 'c'], passphrase: 'abc'}
    expect(
      reducer(initialState, {type: 'passphrase', payload: 'abc'}),
    ).toStrictEqual(expected)
  })
})
