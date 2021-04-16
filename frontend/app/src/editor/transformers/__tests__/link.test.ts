import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { Editor, Text, createEditor } from 'slate';
import faker from 'faker';
import { id as getId } from '../../id';
import { makeProto } from '../make-proto';
import { linkSerialize, LinkNode } from '../transformers';

describe('Transformers: Link Serializer', () => {
  it('default', () => {
    const link: LinkNode = {
      id: getId(),
      type: 'link',
      url: faker.internet.url(),
      children: [
        {
          text: 'Web link',
        },
      ],
    };
    const result = linkSerialize(link);

    const expected = makeProto(new documents.Link(), {
      uri: link.url,
    });

    expect(result).to.deep.equal(expected);
  });
});
