import * as jspb from "google-protobuf"

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';

export class Publication extends jspb.Message {
  getVersion(): string;
  setVersion(value: string): void;

  getDocument(): Document | undefined;
  setDocument(value?: Document): void;
  hasDocument(): boolean;
  clearDocument(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Publication.AsObject;
  static toObject(includeInstance: boolean, msg: Publication): Publication.AsObject;
  static serializeBinaryToWriter(message: Publication, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Publication;
  static deserializeBinaryFromReader(message: Publication, reader: jspb.BinaryReader): Publication;
}

export namespace Publication {
  export type AsObject = {
    version: string,
    document?: Document.AsObject,
  }
}

export class Document extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getTitle(): string;
  setTitle(value: string): void;

  getSubtitle(): string;
  setSubtitle(value: string): void;

  getAuthor(): string;
  setAuthor(value: string): void;

  getChildrenList(): Array<string>;
  setChildrenList(value: Array<string>): void;
  clearChildrenList(): void;
  addChildren(value: string, index?: number): void;

  getBlocksMap(): jspb.Map<string, Block>;
  clearBlocksMap(): void;

  getLinksMap(): jspb.Map<string, Link>;
  clearLinksMap(): void;

  getCreateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setCreateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasCreateTime(): boolean;
  clearCreateTime(): void;

  getUpdateTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setUpdateTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasUpdateTime(): boolean;
  clearUpdateTime(): void;

  getPublishTime(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setPublishTime(value?: google_protobuf_timestamp_pb.Timestamp): void;
  hasPublishTime(): boolean;
  clearPublishTime(): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Document.AsObject;
  static toObject(includeInstance: boolean, msg: Document): Document.AsObject;
  static serializeBinaryToWriter(message: Document, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Document;
  static deserializeBinaryFromReader(message: Document, reader: jspb.BinaryReader): Document;
}

export namespace Document {
  export type AsObject = {
    id: string,
    title: string,
    subtitle: string,
    author: string,
    childrenList: Array<string>,
    blocksMap: Array<[string, Block.AsObject]>,
    linksMap: Array<[string, Link.AsObject]>,
    createTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    updateTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    publishTime?: google_protobuf_timestamp_pb.Timestamp.AsObject,
  }
}

export class Link extends jspb.Message {
  getUri(): string;
  setUri(value: string): void;

  getContentType(): string;
  setContentType(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Link.AsObject;
  static toObject(includeInstance: boolean, msg: Link): Link.AsObject;
  static serializeBinaryToWriter(message: Link, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Link;
  static deserializeBinaryFromReader(message: Link, reader: jspb.BinaryReader): Link;
}

export namespace Link {
  export type AsObject = {
    uri: string,
    contentType: string,
  }
}

export class Block extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getParent(): string;
  setParent(value: string): void;

  getType(): Block.Type;
  setType(value: Block.Type): void;

  getElementsList(): Array<InlineElement>;
  setElementsList(value: Array<InlineElement>): void;
  clearElementsList(): void;
  addElements(value?: InlineElement, index?: number): InlineElement;

  getChildListStyle(): Block.ListStyle;
  setChildListStyle(value: Block.ListStyle): void;

  getChildrenList(): Array<string>;
  setChildrenList(value: Array<string>): void;
  clearChildrenList(): void;
  addChildren(value: string, index?: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Block.AsObject;
  static toObject(includeInstance: boolean, msg: Block): Block.AsObject;
  static serializeBinaryToWriter(message: Block, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Block;
  static deserializeBinaryFromReader(message: Block, reader: jspb.BinaryReader): Block;
}

export namespace Block {
  export type AsObject = {
    id: string,
    parent: string,
    type: Block.Type,
    elementsList: Array<InlineElement.AsObject>,
    childListStyle: Block.ListStyle,
    childrenList: Array<string>,
  }

  export enum ListStyle { 
    NONE = 0,
    BULLET = 1,
    NUMBER = 2,
  }

  export enum Type { 
    TYPE_UNSPECIFIED = 0,
    HEADING = 1,
  }
}

export class InlineElement extends jspb.Message {
  getText(): Text | undefined;
  setText(value?: Text): void;
  hasText(): boolean;
  clearText(): void;

  getImage(): Image | undefined;
  setImage(value?: Image): void;
  hasImage(): boolean;
  clearImage(): void;

  getQuote(): Quote | undefined;
  setQuote(value?: Quote): void;
  hasQuote(): boolean;
  clearQuote(): void;

  getContentCase(): InlineElement.ContentCase;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): InlineElement.AsObject;
  static toObject(includeInstance: boolean, msg: InlineElement): InlineElement.AsObject;
  static serializeBinaryToWriter(message: InlineElement, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): InlineElement;
  static deserializeBinaryFromReader(message: InlineElement, reader: jspb.BinaryReader): InlineElement;
}

export namespace InlineElement {
  export type AsObject = {
    text?: Text.AsObject,
    image?: Image.AsObject,
    quote?: Quote.AsObject,
  }

  export enum ContentCase { 
    CONTENT_NOT_SET = 0,
    TEXT = 1,
    IMAGE = 2,
    QUOTE = 3,
  }
}

export class Image extends jspb.Message {
  getAltText(): string;
  setAltText(value: string): void;

  getLinkKey(): string;
  setLinkKey(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Image.AsObject;
  static toObject(includeInstance: boolean, msg: Image): Image.AsObject;
  static serializeBinaryToWriter(message: Image, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Image;
  static deserializeBinaryFromReader(message: Image, reader: jspb.BinaryReader): Image;
}

export namespace Image {
  export type AsObject = {
    altText: string,
    linkKey: string,
  }
}

export class Quote extends jspb.Message {
  getLinkKey(): string;
  setLinkKey(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Quote.AsObject;
  static toObject(includeInstance: boolean, msg: Quote): Quote.AsObject;
  static serializeBinaryToWriter(message: Quote, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Quote;
  static deserializeBinaryFromReader(message: Quote, reader: jspb.BinaryReader): Quote;
}

export namespace Quote {
  export type AsObject = {
    linkKey: string,
  }
}

export class Text extends jspb.Message {
  getString(): string;
  setString(value: string): void;

  getBold(): boolean;
  setBold(value: boolean): void;

  getUnderline(): boolean;
  setUnderline(value: boolean): void;

  getLinkKey(): string;
  setLinkKey(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Text.AsObject;
  static toObject(includeInstance: boolean, msg: Text): Text.AsObject;
  static serializeBinaryToWriter(message: Text, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Text;
  static deserializeBinaryFromReader(message: Text, reader: jspb.BinaryReader): Text;
}

export namespace Text {
  export type AsObject = {
    string: string,
    bold: boolean,
    underline: boolean,
    linkKey: string,
  }
}

