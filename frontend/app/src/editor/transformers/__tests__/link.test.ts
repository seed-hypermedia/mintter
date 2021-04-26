import { expect } from '@esm-bundle/chai';
import faker from 'faker';
// import { Editor, Text, createEditor } from 'slate';

import documents from '@mintter/api/documents/v1alpha/documents_pb';

import { id as getId } from '../../id';
import { makeProto } from '../make-proto';
import {
  linkSerialize,
  linkDeserialize,
  LinkNode,
  PartialTextRun,
  // createTextRun,
} from '../transformers';

describe('Link', () => {
  const url = faker.internet.url();
  const linkKey = getId();
  const textRun: PartialTextRun = {
    text: 'Web Link',
  };
  const slateNode: LinkNode = {
    id: linkKey,
    url,
    type: 'link',
    children: [textRun],
  };
  const mintterNode: documents.Link = makeProto(new documents.Link(), {
    uri: url,
  });
  it('linkSerialize(): Link', () => {
    const result = linkSerialize(slateNode);
    expect(result).to.deep.equal(mintterNode);
  });

  it('linkDeserialize()', () => {
    const mintterTextRun: documents.TextRun = makeProto(
      new documents.TextRun(),
      {
        ...textRun,
        linkKey,
      },
    );
    const result = linkDeserialize(mintterTextRun, mintterNode);
    expect(result).to.deep.equal(slateNode);
  });
});
