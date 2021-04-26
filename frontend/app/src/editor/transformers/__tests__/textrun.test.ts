import { expect } from '@esm-bundle/chai';
import faker from 'faker';
import type { Text } from 'slate';

import documents from '@mintter/api/documents/v1alpha/documents_pb';

import { makeProto } from '../make-proto';
import {
  textRunSerialize,
  createTextRun,
  // PartialTextRun,
  textRunDeserialize,
} from '../transformers';

describe('TextRun', () => {
  const slateNode: Text = {
    text: faker.lorem.sentence(),
    bold: true,
    underline: true,
  };

  const mintterNode = makeProto(new documents.TextRun(), slateNode);

  it('textRunSerialize()', () => {
    const result = textRunSerialize(slateNode);
    expect(result).to.deep.equal(mintterNode);
  });

  it('textRunDeserialize()', () => {
    const result = textRunDeserialize(mintterNode);
    expect(result).to.deep.equal(createTextRun(slateNode));
  });
});
