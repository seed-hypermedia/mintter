import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { buildBlock, buildDocument } from '@utils/generate';
import faker from 'faker';
import { ELEMENT_BLOCK } from './block-plugin';
export type SlateBlock = {
  type: ELEMENT_BLOCK;
  id: string;
  depth: number;
  children: any[]; // TODO: fix types
};
export function toSlateBlock(
  block: documents.Block | documents.Block.AsObject,
): SlateBlock {
  const obj = block.toObject ? block.toObject() : block;

  return {
    type: ELEMENT_BLOCK,
    id: obj.id,
    depth: getDepth(obj.parent),
    children: obj.elementsList.map(toSlateElement),
  };
}
export type SlateTextRun = Partial<Omit<documents.TextRun.AsObject, 'text'>> & {
  text: string;
};
export type SlateImage = any;
export type SlateQuote = any;
export type SlateInlineElement = SlateTextRun | SlateImage | SlateQuote;

export function toSlateElement(
  element: documents.InlineElement | documents.InlineElement.AsObject,
): SlateInlineElement {
  const el: documents.InlineElement.AsObject = element.toObject
    ? element.toObject()
    : element;

  let result = {};
}

export function getDepth(parent?: number) {
  // TODO: wtf do I need to do here to get the correct depth??
  return 0;
}