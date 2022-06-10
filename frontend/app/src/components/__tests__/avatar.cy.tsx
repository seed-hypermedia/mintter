import {mount} from '@cypress/react'
import {Avatar} from '../avatar'

describe('<Avatar />', () => {
  console.log('ENTER DESCRIBE')
  it('default', () => {
    console.log('ENTER TEST')
    mount(<Avatar size="3" />)
  })
})
