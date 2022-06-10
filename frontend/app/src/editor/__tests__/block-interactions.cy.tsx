import {Publication} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {mountProviders} from '@app/test/utils'
import {paragraph, statement, text} from '@mintter/mttast'
import {QueryClient} from 'react-query'

describe('Editor Block Interactions', function describe() {
  let elClient: QueryClient
  let elRender: any
  let elPub: Publication

  beforeEach(function beforeEach() {
    let date = new Date()
    let block = statement({id: 'blockid'}, [paragraph([text('hello block')])])
    let pub: Publication = {
      version: 'v1',
      document: {
        id: 'foo',
        title: 'test publication',
        subtitle: '',
        author: '', // author will be overriden with the created account
        content: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: date,
        updateTime: date,
        publishTime: date,
      },
    }

    const {client, render} = mountProviders({
      publication: pub,
    })

    elClient = client
    elRender = render
    elPub = pub
  })
})
