import { expect } from '@esm-bundle/chai';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import type { Text } from 'slate';
import faker from 'faker';
import { makeProto } from '../make-proto';
import {
  textRunSerialize,
  createTextRun,
  PartialTextRun,
  textRunDeserialize,
} from '../transformers';

describe('TextRun: Serialize', () => {
  it('default: no attributes', () => {
    const textNode: Text = {
      text: faker.lorem.sentence(),
    };
    const result = textRunSerialize(textNode);
    const expected = makeProto(new documents.TextRun(), {
      text: textNode.text,
    });

    expect(result).to.deep.equal(expected);
  });

  it('with attributes', () => {
    const textNode: Text = {
      text: faker.lorem.sentence(),
      bold: true,
      underline: true,
    };

    const result = textRunSerialize(textNode);
    const expected = makeProto(new documents.TextRun(), textNode);
    expect(result).to.deep.equal(expected);
  });
});

describe('TextRun: Deserialize', () => {
  const text = faker.lorem.sentence();
  it('default', () => {
    const textNode: documents.TextRun = makeProto(new documents.TextRun(), {
      text,
    });

    const result = textRunDeserialize(textNode);
    const expected = createTextRun({ text });

    expect(result).to.deep.equal(expected);
  });

  it('with attributes', () => {
    const textNode: documents.TextRun = makeProto(new documents.TextRun(), {
      text,
      bold: true,
      underline: true,
    });

    const result = textRunDeserialize(textNode);
    const expected = createTextRun({
      text,
      bold: true,
      underline: true,
    });

    expect(result).to.deep.equal(expected);
  });
});
