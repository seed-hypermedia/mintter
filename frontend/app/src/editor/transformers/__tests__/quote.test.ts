import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { Editor, Text, createEditor } from 'slate';
import faker from 'faker';
import { id as getId } from '../../id';
import { makeProto } from '../make-proto';
import {
  QuoteNode,
  quoteSerialize,
  textRunSerialize,
  inlineElementSerialize,
  createTextRun,
  PartialTextRun,
  blockSerialize,
  BlockNode,
  linkSerialize,
  LinkNode,
  SlateDocument,
  documentSerialize,
} from '../transformers';

describe('Quote: Serialize', () => {
  it('default', () => {
    const quote: QuoteNode = {
      id: getId(),
      type: 'quote',
      linkKey: `mintter://${faker.finance.bitcoinAddress()}`,
      startOffset: 0,
      endOffset: 0,
      children: [{ text: '' }],
    };

    const result = quoteSerialize(quote);
    const expected = new documents.Quote();
    expected.setLinkKey(quote.linkKey);
    expected.setStartOffset(quote.startOffset as number);
    expected.setEndOffset(quote.endOffset as number);

    expect(result).to.deep.equal(expected);
  });
});

describe('Quote: Deserialize', () => {});
