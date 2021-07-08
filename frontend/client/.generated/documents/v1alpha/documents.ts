//@ts-nocheck
/* eslint-disable */
import {util, configure, Writer, Reader} from 'protobufjs/minimal'
import * as Long from 'long'
import {grpc} from '@improbable-eng/grpc-web'
import {Empty} from '../../google/protobuf/empty'
import {BrowserHeaders} from 'browser-headers'
import {Timestamp} from '../../google/protobuf/timestamp'

/** Defines if the documents being returned should be displayed in full or only basic information. */
export enum DocumentView {
  /** VIEW_UNSPECIFIED - Default value. Same as BASIC. */
  VIEW_UNSPECIFIED = 0,
  /** BASIC - Basic view. Do not display content nor links. */
  BASIC = 1,
  /** FULL - Full view. Return every field of the underlying resource. */
  FULL = 2,
  UNRECOGNIZED = -1,
}

export function documentViewFromJSON(object: any): DocumentView {
  switch (object) {
    case 0:
    case 'VIEW_UNSPECIFIED':
      return DocumentView.VIEW_UNSPECIFIED
    case 1:
    case 'BASIC':
      return DocumentView.BASIC
    case 2:
    case 'FULL':
      return DocumentView.FULL
    case -1:
    case 'UNRECOGNIZED':
    default:
      return DocumentView.UNRECOGNIZED
  }
}

export function documentViewToJSON(object: DocumentView): string {
  switch (object) {
    case DocumentView.VIEW_UNSPECIFIED:
      return 'VIEW_UNSPECIFIED'
    case DocumentView.BASIC:
      return 'BASIC'
    case DocumentView.FULL:
      return 'FULL'
    default:
      return 'UNKNOWN'
  }
}

/** List style for a list of blocks. */
export enum ListStyle {
  /** NONE - Use no marker to display the block. */
  NONE = 0,
  /** BULLET - Use a bullet marker to display the block. */
  BULLET = 1,
  /** NUMBER - Use an ordered number to display the block. */
  NUMBER = 2,
  UNRECOGNIZED = -1,
}

export function listStyleFromJSON(object: any): ListStyle {
  switch (object) {
    case 0:
    case 'NONE':
      return ListStyle.NONE
    case 1:
    case 'BULLET':
      return ListStyle.BULLET
    case 2:
    case 'NUMBER':
      return ListStyle.NUMBER
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ListStyle.UNRECOGNIZED
  }
}

export function listStyleToJSON(object: ListStyle): string {
  switch (object) {
    case ListStyle.NONE:
      return 'NONE'
    case ListStyle.BULLET:
      return 'BULLET'
    case ListStyle.NUMBER:
      return 'NUMBER'
    default:
      return 'UNKNOWN'
  }
}

/** Request to create a new draft. */
export interface CreateDraftRequest {}

/** Request to delete an existing draft. */
export interface DeleteDraftRequest {
  /** ID of the document whose draft needs to be deleted. */
  documentId: string
}

/** Request to get a single draft. */
export interface GetDraftRequest {
  /** ID of the document for which draft was previously created. */
  documentId: string
}

/** Request to update an existing draft. */
export interface UpdateDraftRequest {
  /** Instance of the document. */
  document: Document | undefined
}

/** Request to list stored drafts. */
export interface ListDraftsRequest {
  /** Optional. Number of results per page. */
  pageSize: number
  /** Optional. Token for the page to return. */
  pageToken: string
  /** Optional. View of the each document instance to return. */
  view: DocumentView
}

/** Response for listing drafts. */
export interface ListDraftsResponse {
  /**
   * Documents being matched by the list request. Items in this list
   * won't be complete, and only basic information will be present.
   * To get the full content a separate Get request is needed.
   */
  documents: Document[]
  /** Token for the next page if there're any. */
  nextPageToken: string
}

/** Request to publish a draft. */
export interface PublishDraftRequest {
  /** ID of the document which current draft needs to be published. */
  documentId: string
}

/** Response from publishing a draft. */
export interface PublishDraftResponse {
  /** Content-addressable version ID of the newly published document. */
  version: string
}

/** Request for getting a single publication. */
export interface GetPublicationRequest {
  /** Required. ID of the published document. */
  documentId: string
  /** Optional. Specific version of the published document. By default latest is returned. */
  version: string
}

/** Request for deleting a publication. */
export interface DeletePublicationRequest {
  /** Document ID of the publication to be removed. */
  documentId: string
}

/** Request for listing publications. */
export interface ListPublicationsRequest {
  /** Optional. Number of results per page. Default is defined by the server. */
  pageSize: number
  /** Optional. Token of the page if obtained from the previous request. */
  pageToken: string
  /** Optional. View of each document instance in the list. */
  view: DocumentView
}

/** Response with list of publications. */
export interface ListPublicationsResponse {
  /**
   * List of publications matching the request. Items in this list
   * won't be complete, and only basic information will be present.
   * To get the full content a separate Get request is needed.
   */
  publications: Publication[]
  /** Token for the next page if there're more results. */
  nextPageToken: string
}

/** A published document with a content-addressable version ID. */
export interface Publication {
  /** Output only. The actual document itself. */
  document: Document | undefined
}

/** State of the Mintter document. */
export interface Document {
  /** Output only. Permanent ID of the document. */
  id: string
  /** Required. Title of the document. */
  title: string
  /** Required. Subtitle/abstract of the document. */
  subtitle: string
  /** Output only. ID of the author of the document. */
  author: string
  /** Optional. List style for displaying top-level document blocks. */
  childrenListStyle: ListStyle
  /** Required. List of top-level content blocks. */
  children: string[]
  /** Required. Lookup map of all the content blocks of this document. */
  blocks: {[key: string]: Block}
  /** Lookup map of all the links used in this document. */
  links: {[key: string]: Link}
  /** Output only. Time when first draft of this document was created. */
  createTime: Date | undefined
  /** Output only. Time when this document was updated. */
  updateTime: Date | undefined
  /**
   * Output only. Only set if this document is already published. Time when this
   * document was published.
   */
  publishTime: Date | undefined
}

export interface Document_BlocksEntry {
  key: string
  value: Block | undefined
}

export interface Document_LinksEntry {
  key: string
  value: Link | undefined
}

/** Link to another resource. */
export interface Link {
  /** Required. URI this link points to. */
  uri: string
  /** Optional. Content type for the content this URI points to. */
  mimeType: string
}

/** Block of content. */
export interface Block {
  /** Required. ID of the block. Must be unique within the document. */
  id: string
  /**
   * Required. ID of the parent block. Empty if this is a top-level block. The
   * ID must be present in the blocks map of the document.
   */
  parent: string
  /** Required. Type of this block. */
  type: Block_Type
  /**
   * Required. List of inline elements/spans of this block. This is the actual
   * content of the block.
   */
  elements: InlineElement[]
  /**
   * Optional. Defines which list style must be applied to the children of this
   * block if there're any.
   */
  childListStyle: ListStyle
  /**
   * Optional. List of IDs of child content blocks. The ID must be present in
   * the blocks map of the document.
   */
  children: string[]
}

/** Block type. This is an enum to support future types, even though we only have defined a single heading type. */
export enum Block_Type {
  /** BASIC - Basic blocks. */
  BASIC = 0,
  /**
   * HEADING - Heading is used for blocks that are headings.
   *
   * Heading blocks should contain the enclosed content as children, unlike HTML and others where headings are
   * detached from their content. We also don't have explicit heading levels to avoid common mistakes when authors
   * would incorrectly use them. Instead we infer the level of the current heading by inspecting its parent blocks.
   *
   * Heading blocks must contain a single text run inline element, as headings can't be embedded objects, or support
   * other rich text formatting.
   */
  HEADING = 1,
  UNRECOGNIZED = -1,
}

export function block_TypeFromJSON(object: any): Block_Type {
  switch (object) {
    case 0:
    case 'BASIC':
      return Block_Type.BASIC
    case 1:
    case 'HEADING':
      return Block_Type.HEADING
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Block_Type.UNRECOGNIZED
  }
}

export function block_TypeToJSON(object: Block_Type): string {
  switch (object) {
    case Block_Type.BASIC:
      return 'BASIC'
    case Block_Type.HEADING:
      return 'HEADING'
    default:
      return 'UNKNOWN'
  }
}

/** Element of a content block. */
export interface InlineElement {
  /**
   * Text run with support for attributes. If multiple text inline elements
   * have the same attributes, they are expected to be merged together by the
   * client.
   */
  textRun: TextRun | undefined
  /** Multimedia image. */
  image: Image | undefined
  /**
   * Quote from another Mintter document. The content is supposed to be
   * resolved and brought-in by the client.
   */
  quote: Quote | undefined
}

/** Run of text with attributes. */
export interface TextRun {
  /** Actual string of text. */
  text: string
  /** Bold formatting attribute. */
  bold: boolean
  /** Italic formatting attribute. */
  italic: boolean
  /** Underline formatting attribute. */
  underline: boolean
  /** Strikethrough formatting attribute. */
  strikethrough: boolean
  /** Code formatting attribute. */
  code: boolean
  /** Blockquote formatting attribute. This is available for content that can't be reused with Mintter Quotes. */
  blockquote: boolean
  /**
   * If text is an anchor for a link - this must be a map key from the document's links lookup map that corresponds to
   * the link.
   */
  linkKey: string
}

/** Image embedded object. */
export interface Image {
  /**
   * Alt text of the image. Useful for accessibility purposes. Supposed to
   * describe the content of the image with words.
   */
  altText: string
  /**
   * Key to the link that points to the image. The key must be present in the
   * top-level links map of the document.
   */
  linkKey: string
}

/** Embedded object for Mintter Quote. */
export interface Quote {
  /** Required. Key from the document's links lookup map. Must be a link to a Mintter Block. */
  linkKey: string
  /** Optional. Offset from which quoted fragment starts. */
  startOffset: number
  /** Optional. Offset where quoted fragment ends. */
  endOffset: number
}

/**
 * This event gets produced every time a new document is published for the first time.
 * We'll have a feed of these events from which other peers can learn about new documents
 * being published.
 */
export interface DocumentPublished {
  documentId: string
  title: string
  subtitle: string
}

const baseCreateDraftRequest: object = {}

export const CreateDraftRequest = {
  encode(_: CreateDraftRequest, writer: Writer = Writer.create()): Writer {
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): CreateDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseCreateDraftRequest} as CreateDraftRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(_: any): CreateDraftRequest {
    const message = {...baseCreateDraftRequest} as CreateDraftRequest
    return message
  },

  toJSON(_: CreateDraftRequest): unknown {
    const obj: any = {}
    return obj
  },

  fromPartial(_: DeepPartial<CreateDraftRequest>): CreateDraftRequest {
    const message = {...baseCreateDraftRequest} as CreateDraftRequest
    return message
  },
}

const baseDeleteDraftRequest: object = {documentId: ''}

export const DeleteDraftRequest = {
  encode(message: DeleteDraftRequest, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): DeleteDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDeleteDraftRequest} as DeleteDraftRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): DeleteDraftRequest {
    const message = {...baseDeleteDraftRequest} as DeleteDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    return message
  },

  toJSON(message: DeleteDraftRequest): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    return obj
  },

  fromPartial(object: DeepPartial<DeleteDraftRequest>): DeleteDraftRequest {
    const message = {...baseDeleteDraftRequest} as DeleteDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    return message
  },
}

const baseGetDraftRequest: object = {documentId: ''}

export const GetDraftRequest = {
  encode(message: GetDraftRequest, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): GetDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseGetDraftRequest} as GetDraftRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GetDraftRequest {
    const message = {...baseGetDraftRequest} as GetDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    return message
  },

  toJSON(message: GetDraftRequest): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    return obj
  },

  fromPartial(object: DeepPartial<GetDraftRequest>): GetDraftRequest {
    const message = {...baseGetDraftRequest} as GetDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    return message
  },
}

const baseUpdateDraftRequest: object = {}

export const UpdateDraftRequest = {
  encode(message: UpdateDraftRequest, writer: Writer = Writer.create()): Writer {
    if (message.document !== undefined) {
      Document.encode(message.document, writer.uint32(10).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): UpdateDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseUpdateDraftRequest} as UpdateDraftRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.document = Document.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): UpdateDraftRequest {
    const message = {...baseUpdateDraftRequest} as UpdateDraftRequest
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromJSON(object.document)
    } else {
      message.document = undefined
    }
    return message
  },

  toJSON(message: UpdateDraftRequest): unknown {
    const obj: any = {}
    message.document !== undefined && (obj.document = message.document ? Document.toJSON(message.document) : undefined)
    return obj
  },

  fromPartial(object: DeepPartial<UpdateDraftRequest>): UpdateDraftRequest {
    const message = {...baseUpdateDraftRequest} as UpdateDraftRequest
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromPartial(object.document)
    } else {
      message.document = undefined
    }
    return message
  },
}

const baseListDraftsRequest: object = {pageSize: 0, pageToken: '', view: 0}

export const ListDraftsRequest = {
  encode(message: ListDraftsRequest, writer: Writer = Writer.create()): Writer {
    if (message.pageSize !== 0) {
      writer.uint32(8).int32(message.pageSize)
    }
    if (message.pageToken !== '') {
      writer.uint32(18).string(message.pageToken)
    }
    if (message.view !== 0) {
      writer.uint32(24).int32(message.view)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): ListDraftsRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseListDraftsRequest} as ListDraftsRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.pageSize = reader.int32()
          break
        case 2:
          message.pageToken = reader.string()
          break
        case 3:
          message.view = reader.int32() as any
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): ListDraftsRequest {
    const message = {...baseListDraftsRequest} as ListDraftsRequest
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = Number(object.pageSize)
    } else {
      message.pageSize = 0
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = String(object.pageToken)
    } else {
      message.pageToken = ''
    }
    if (object.view !== undefined && object.view !== null) {
      message.view = documentViewFromJSON(object.view)
    } else {
      message.view = 0
    }
    return message
  },

  toJSON(message: ListDraftsRequest): unknown {
    const obj: any = {}
    message.pageSize !== undefined && (obj.pageSize = message.pageSize)
    message.pageToken !== undefined && (obj.pageToken = message.pageToken)
    message.view !== undefined && (obj.view = documentViewToJSON(message.view))
    return obj
  },

  fromPartial(object: DeepPartial<ListDraftsRequest>): ListDraftsRequest {
    const message = {...baseListDraftsRequest} as ListDraftsRequest
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = object.pageSize
    } else {
      message.pageSize = 0
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = object.pageToken
    } else {
      message.pageToken = ''
    }
    if (object.view !== undefined && object.view !== null) {
      message.view = object.view
    } else {
      message.view = 0
    }
    return message
  },
}

const baseListDraftsResponse: object = {nextPageToken: ''}

export const ListDraftsResponse = {
  encode(message: ListDraftsResponse, writer: Writer = Writer.create()): Writer {
    for (const v of message.documents) {
      Document.encode(v!, writer.uint32(10).fork()).ldelim()
    }
    if (message.nextPageToken !== '') {
      writer.uint32(18).string(message.nextPageToken)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): ListDraftsResponse {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseListDraftsResponse} as ListDraftsResponse
    message.documents = []
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documents.push(Document.decode(reader, reader.uint32()))
          break
        case 2:
          message.nextPageToken = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): ListDraftsResponse {
    const message = {...baseListDraftsResponse} as ListDraftsResponse
    message.documents = []
    if (object.documents !== undefined && object.documents !== null) {
      for (const e of object.documents) {
        message.documents.push(Document.fromJSON(e))
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = String(object.nextPageToken)
    } else {
      message.nextPageToken = ''
    }
    return message
  },

  toJSON(message: ListDraftsResponse): unknown {
    const obj: any = {}
    if (message.documents) {
      obj.documents = message.documents.map((e) => (e ? Document.toJSON(e) : undefined))
    } else {
      obj.documents = []
    }
    message.nextPageToken !== undefined && (obj.nextPageToken = message.nextPageToken)
    return obj
  },

  fromPartial(object: DeepPartial<ListDraftsResponse>): ListDraftsResponse {
    const message = {...baseListDraftsResponse} as ListDraftsResponse
    message.documents = []
    if (object.documents !== undefined && object.documents !== null) {
      for (const e of object.documents) {
        message.documents.push(Document.fromPartial(e))
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = object.nextPageToken
    } else {
      message.nextPageToken = ''
    }
    return message
  },
}

const basePublishDraftRequest: object = {documentId: ''}

export const PublishDraftRequest = {
  encode(message: PublishDraftRequest, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): PublishDraftRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...basePublishDraftRequest} as PublishDraftRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): PublishDraftRequest {
    const message = {...basePublishDraftRequest} as PublishDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    return message
  },

  toJSON(message: PublishDraftRequest): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    return obj
  },

  fromPartial(object: DeepPartial<PublishDraftRequest>): PublishDraftRequest {
    const message = {...basePublishDraftRequest} as PublishDraftRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    return message
  },
}

const basePublishDraftResponse: object = {version: ''}

export const PublishDraftResponse = {
  encode(message: PublishDraftResponse, writer: Writer = Writer.create()): Writer {
    if (message.version !== '') {
      writer.uint32(10).string(message.version)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): PublishDraftResponse {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...basePublishDraftResponse} as PublishDraftResponse
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): PublishDraftResponse {
    const message = {...basePublishDraftResponse} as PublishDraftResponse
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version)
    } else {
      message.version = ''
    }
    return message
  },

  toJSON(message: PublishDraftResponse): unknown {
    const obj: any = {}
    message.version !== undefined && (obj.version = message.version)
    return obj
  },

  fromPartial(object: DeepPartial<PublishDraftResponse>): PublishDraftResponse {
    const message = {...basePublishDraftResponse} as PublishDraftResponse
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version
    } else {
      message.version = ''
    }
    return message
  },
}

const baseGetPublicationRequest: object = {documentId: '', version: ''}

export const GetPublicationRequest = {
  encode(message: GetPublicationRequest, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    if (message.version !== '') {
      writer.uint32(18).string(message.version)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): GetPublicationRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseGetPublicationRequest} as GetPublicationRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        case 2:
          message.version = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): GetPublicationRequest {
    const message = {...baseGetPublicationRequest} as GetPublicationRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    if (object.version !== undefined && object.version !== null) {
      message.version = String(object.version)
    } else {
      message.version = ''
    }
    return message
  },

  toJSON(message: GetPublicationRequest): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    message.version !== undefined && (obj.version = message.version)
    return obj
  },

  fromPartial(object: DeepPartial<GetPublicationRequest>): GetPublicationRequest {
    const message = {...baseGetPublicationRequest} as GetPublicationRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version
    } else {
      message.version = ''
    }
    return message
  },
}

const baseDeletePublicationRequest: object = {documentId: ''}

export const DeletePublicationRequest = {
  encode(message: DeletePublicationRequest, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): DeletePublicationRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDeletePublicationRequest} as DeletePublicationRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): DeletePublicationRequest {
    const message = {...baseDeletePublicationRequest} as DeletePublicationRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    return message
  },

  toJSON(message: DeletePublicationRequest): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    return obj
  },

  fromPartial(object: DeepPartial<DeletePublicationRequest>): DeletePublicationRequest {
    const message = {...baseDeletePublicationRequest} as DeletePublicationRequest
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    return message
  },
}

const baseListPublicationsRequest: object = {pageSize: 0, pageToken: '', view: 0}

export const ListPublicationsRequest = {
  encode(message: ListPublicationsRequest, writer: Writer = Writer.create()): Writer {
    if (message.pageSize !== 0) {
      writer.uint32(8).int32(message.pageSize)
    }
    if (message.pageToken !== '') {
      writer.uint32(18).string(message.pageToken)
    }
    if (message.view !== 0) {
      writer.uint32(24).int32(message.view)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): ListPublicationsRequest {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseListPublicationsRequest} as ListPublicationsRequest
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.pageSize = reader.int32()
          break
        case 2:
          message.pageToken = reader.string()
          break
        case 3:
          message.view = reader.int32() as any
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): ListPublicationsRequest {
    const message = {...baseListPublicationsRequest} as ListPublicationsRequest
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = Number(object.pageSize)
    } else {
      message.pageSize = 0
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = String(object.pageToken)
    } else {
      message.pageToken = ''
    }
    if (object.view !== undefined && object.view !== null) {
      message.view = documentViewFromJSON(object.view)
    } else {
      message.view = 0
    }
    return message
  },

  toJSON(message: ListPublicationsRequest): unknown {
    const obj: any = {}
    message.pageSize !== undefined && (obj.pageSize = message.pageSize)
    message.pageToken !== undefined && (obj.pageToken = message.pageToken)
    message.view !== undefined && (obj.view = documentViewToJSON(message.view))
    return obj
  },

  fromPartial(object: DeepPartial<ListPublicationsRequest>): ListPublicationsRequest {
    const message = {...baseListPublicationsRequest} as ListPublicationsRequest
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = object.pageSize
    } else {
      message.pageSize = 0
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = object.pageToken
    } else {
      message.pageToken = ''
    }
    if (object.view !== undefined && object.view !== null) {
      message.view = object.view
    } else {
      message.view = 0
    }
    return message
  },
}

const baseListPublicationsResponse: object = {nextPageToken: ''}

export const ListPublicationsResponse = {
  encode(message: ListPublicationsResponse, writer: Writer = Writer.create()): Writer {
    for (const v of message.publications) {
      Publication.encode(v!, writer.uint32(10).fork()).ldelim()
    }
    if (message.nextPageToken !== '') {
      writer.uint32(18).string(message.nextPageToken)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): ListPublicationsResponse {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseListPublicationsResponse} as ListPublicationsResponse
    message.publications = []
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.publications.push(Publication.decode(reader, reader.uint32()))
          break
        case 2:
          message.nextPageToken = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): ListPublicationsResponse {
    const message = {...baseListPublicationsResponse} as ListPublicationsResponse
    message.publications = []
    if (object.publications !== undefined && object.publications !== null) {
      for (const e of object.publications) {
        message.publications.push(Publication.fromJSON(e))
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = String(object.nextPageToken)
    } else {
      message.nextPageToken = ''
    }
    return message
  },

  toJSON(message: ListPublicationsResponse): unknown {
    const obj: any = {}
    if (message.publications) {
      obj.publications = message.publications.map((e) => (e ? Publication.toJSON(e) : undefined))
    } else {
      obj.publications = []
    }
    message.nextPageToken !== undefined && (obj.nextPageToken = message.nextPageToken)
    return obj
  },

  fromPartial(object: DeepPartial<ListPublicationsResponse>): ListPublicationsResponse {
    const message = {...baseListPublicationsResponse} as ListPublicationsResponse
    message.publications = []
    if (object.publications !== undefined && object.publications !== null) {
      for (const e of object.publications) {
        message.publications.push(Publication.fromPartial(e))
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = object.nextPageToken
    } else {
      message.nextPageToken = ''
    }
    return message
  },
}

const basePublication: object = {}

export const Publication = {
  encode(message: Publication, writer: Writer = Writer.create()): Writer {
    if (message.document !== undefined) {
      Document.encode(message.document, writer.uint32(18).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Publication {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...basePublication} as Publication
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 2:
          message.document = Document.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Publication {
    const message = {...basePublication} as Publication
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromJSON(object.document)
    } else {
      message.document = undefined
    }
    return message
  },

  toJSON(message: Publication): unknown {
    const obj: any = {}
    message.document !== undefined && (obj.document = message.document ? Document.toJSON(message.document) : undefined)
    return obj
  },

  fromPartial(object: DeepPartial<Publication>): Publication {
    const message = {...basePublication} as Publication
    if (object.document !== undefined && object.document !== null) {
      message.document = Document.fromPartial(object.document)
    } else {
      message.document = undefined
    }
    return message
  },
}

const baseDocument: object = {id: '', title: '', subtitle: '', author: '', childrenListStyle: 0, children: ''}

export const Document = {
  encode(message: Document, writer: Writer = Writer.create()): Writer {
    if (message.id !== '') {
      writer.uint32(10).string(message.id)
    }
    if (message.title !== '') {
      writer.uint32(18).string(message.title)
    }
    if (message.subtitle !== '') {
      writer.uint32(26).string(message.subtitle)
    }
    if (message.author !== '') {
      writer.uint32(34).string(message.author)
    }
    if (message.childrenListStyle !== 0) {
      writer.uint32(40).int32(message.childrenListStyle)
    }
    for (const v of message.children) {
      writer.uint32(50).string(v!)
    }
    Object.entries(message.blocks).forEach(([key, value]) => {
      Document_BlocksEntry.encode({key: key as any, value}, writer.uint32(58).fork()).ldelim()
    })
    Object.entries(message.links).forEach(([key, value]) => {
      Document_LinksEntry.encode({key: key as any, value}, writer.uint32(66).fork()).ldelim()
    })
    if (message.createTime !== undefined) {
      Timestamp.encode(toTimestamp(message.createTime), writer.uint32(74).fork()).ldelim()
    }
    if (message.updateTime !== undefined) {
      Timestamp.encode(toTimestamp(message.updateTime), writer.uint32(82).fork()).ldelim()
    }
    if (message.publishTime !== undefined) {
      Timestamp.encode(toTimestamp(message.publishTime), writer.uint32(90).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Document {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDocument} as Document
    message.children = []
    message.blocks = {}
    message.links = {}
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string()
          break
        case 2:
          message.title = reader.string()
          break
        case 3:
          message.subtitle = reader.string()
          break
        case 4:
          message.author = reader.string()
          break
        case 5:
          message.childrenListStyle = reader.int32() as any
          break
        case 6:
          message.children.push(reader.string())
          break
        case 7:
          const entry7 = Document_BlocksEntry.decode(reader, reader.uint32())
          if (entry7.value !== undefined) {
            message.blocks[entry7.key] = entry7.value
          }
          break
        case 8:
          const entry8 = Document_LinksEntry.decode(reader, reader.uint32())
          if (entry8.value !== undefined) {
            message.links[entry8.key] = entry8.value
          }
          break
        case 9:
          message.createTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()))
          break
        case 10:
          message.updateTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()))
          break
        case 11:
          message.publishTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()))
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Document {
    const message = {...baseDocument} as Document
    message.children = []
    message.blocks = {}
    message.links = {}
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id)
    } else {
      message.id = ''
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = String(object.title)
    } else {
      message.title = ''
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = String(object.subtitle)
    } else {
      message.subtitle = ''
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = String(object.author)
    } else {
      message.author = ''
    }
    if (object.childrenListStyle !== undefined && object.childrenListStyle !== null) {
      message.childrenListStyle = listStyleFromJSON(object.childrenListStyle)
    } else {
      message.childrenListStyle = 0
    }
    if (object.children !== undefined && object.children !== null) {
      for (const e of object.children) {
        message.children.push(String(e))
      }
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        message.blocks[key] = Block.fromJSON(value)
      })
    }
    if (object.links !== undefined && object.links !== null) {
      Object.entries(object.links).forEach(([key, value]) => {
        message.links[key] = Link.fromJSON(value)
      })
    }
    if (object.createTime !== undefined && object.createTime !== null) {
      message.createTime = fromJsonTimestamp(object.createTime)
    } else {
      message.createTime = undefined
    }
    if (object.updateTime !== undefined && object.updateTime !== null) {
      message.updateTime = fromJsonTimestamp(object.updateTime)
    } else {
      message.updateTime = undefined
    }
    if (object.publishTime !== undefined && object.publishTime !== null) {
      message.publishTime = fromJsonTimestamp(object.publishTime)
    } else {
      message.publishTime = undefined
    }
    return message
  },

  toJSON(message: Document): unknown {
    const obj: any = {}
    message.id !== undefined && (obj.id = message.id)
    message.title !== undefined && (obj.title = message.title)
    message.subtitle !== undefined && (obj.subtitle = message.subtitle)
    message.author !== undefined && (obj.author = message.author)
    message.childrenListStyle !== undefined && (obj.childrenListStyle = listStyleToJSON(message.childrenListStyle))
    if (message.children) {
      obj.children = message.children.map((e) => e)
    } else {
      obj.children = []
    }
    obj.blocks = {}
    if (message.blocks) {
      Object.entries(message.blocks).forEach(([k, v]) => {
        obj.blocks[k] = Block.toJSON(v)
      })
    }
    obj.links = {}
    if (message.links) {
      Object.entries(message.links).forEach(([k, v]) => {
        obj.links[k] = Link.toJSON(v)
      })
    }
    message.createTime !== undefined && (obj.createTime = message.createTime.toISOString())
    message.updateTime !== undefined && (obj.updateTime = message.updateTime.toISOString())
    message.publishTime !== undefined && (obj.publishTime = message.publishTime.toISOString())
    return obj
  },

  fromPartial(object: DeepPartial<Document>): Document {
    const message = {...baseDocument} as Document
    message.children = []
    message.blocks = {}
    message.links = {}
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id
    } else {
      message.id = ''
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = object.title
    } else {
      message.title = ''
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = object.subtitle
    } else {
      message.subtitle = ''
    }
    if (object.author !== undefined && object.author !== null) {
      message.author = object.author
    } else {
      message.author = ''
    }
    if (object.childrenListStyle !== undefined && object.childrenListStyle !== null) {
      message.childrenListStyle = object.childrenListStyle
    } else {
      message.childrenListStyle = 0
    }
    if (object.children !== undefined && object.children !== null) {
      for (const e of object.children) {
        message.children.push(e)
      }
    }
    if (object.blocks !== undefined && object.blocks !== null) {
      Object.entries(object.blocks).forEach(([key, value]) => {
        if (value !== undefined) {
          message.blocks[key] = Block.fromPartial(value)
        }
      })
    }
    if (object.links !== undefined && object.links !== null) {
      Object.entries(object.links).forEach(([key, value]) => {
        if (value !== undefined) {
          message.links[key] = Link.fromPartial(value)
        }
      })
    }
    if (object.createTime !== undefined && object.createTime !== null) {
      message.createTime = object.createTime
    } else {
      message.createTime = undefined
    }
    if (object.updateTime !== undefined && object.updateTime !== null) {
      message.updateTime = object.updateTime
    } else {
      message.updateTime = undefined
    }
    if (object.publishTime !== undefined && object.publishTime !== null) {
      message.publishTime = object.publishTime
    } else {
      message.publishTime = undefined
    }
    return message
  },
}

const baseDocument_BlocksEntry: object = {key: ''}

export const Document_BlocksEntry = {
  encode(message: Document_BlocksEntry, writer: Writer = Writer.create()): Writer {
    if (message.key !== '') {
      writer.uint32(10).string(message.key)
    }
    if (message.value !== undefined) {
      Block.encode(message.value, writer.uint32(18).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Document_BlocksEntry {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDocument_BlocksEntry} as Document_BlocksEntry
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string()
          break
        case 2:
          message.value = Block.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Document_BlocksEntry {
    const message = {...baseDocument_BlocksEntry} as Document_BlocksEntry
    if (object.key !== undefined && object.key !== null) {
      message.key = String(object.key)
    } else {
      message.key = ''
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromJSON(object.value)
    } else {
      message.value = undefined
    }
    return message
  },

  toJSON(message: Document_BlocksEntry): unknown {
    const obj: any = {}
    message.key !== undefined && (obj.key = message.key)
    message.value !== undefined && (obj.value = message.value ? Block.toJSON(message.value) : undefined)
    return obj
  },

  fromPartial(object: DeepPartial<Document_BlocksEntry>): Document_BlocksEntry {
    const message = {...baseDocument_BlocksEntry} as Document_BlocksEntry
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key
    } else {
      message.key = ''
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Block.fromPartial(object.value)
    } else {
      message.value = undefined
    }
    return message
  },
}

const baseDocument_LinksEntry: object = {key: ''}

export const Document_LinksEntry = {
  encode(message: Document_LinksEntry, writer: Writer = Writer.create()): Writer {
    if (message.key !== '') {
      writer.uint32(10).string(message.key)
    }
    if (message.value !== undefined) {
      Link.encode(message.value, writer.uint32(18).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Document_LinksEntry {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDocument_LinksEntry} as Document_LinksEntry
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string()
          break
        case 2:
          message.value = Link.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Document_LinksEntry {
    const message = {...baseDocument_LinksEntry} as Document_LinksEntry
    if (object.key !== undefined && object.key !== null) {
      message.key = String(object.key)
    } else {
      message.key = ''
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Link.fromJSON(object.value)
    } else {
      message.value = undefined
    }
    return message
  },

  toJSON(message: Document_LinksEntry): unknown {
    const obj: any = {}
    message.key !== undefined && (obj.key = message.key)
    message.value !== undefined && (obj.value = message.value ? Link.toJSON(message.value) : undefined)
    return obj
  },

  fromPartial(object: DeepPartial<Document_LinksEntry>): Document_LinksEntry {
    const message = {...baseDocument_LinksEntry} as Document_LinksEntry
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key
    } else {
      message.key = ''
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Link.fromPartial(object.value)
    } else {
      message.value = undefined
    }
    return message
  },
}

const baseLink: object = {uri: '', mimeType: ''}

export const Link = {
  encode(message: Link, writer: Writer = Writer.create()): Writer {
    if (message.uri !== '') {
      writer.uint32(10).string(message.uri)
    }
    if (message.mimeType !== '') {
      writer.uint32(18).string(message.mimeType)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Link {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseLink} as Link
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.uri = reader.string()
          break
        case 2:
          message.mimeType = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Link {
    const message = {...baseLink} as Link
    if (object.uri !== undefined && object.uri !== null) {
      message.uri = String(object.uri)
    } else {
      message.uri = ''
    }
    if (object.mimeType !== undefined && object.mimeType !== null) {
      message.mimeType = String(object.mimeType)
    } else {
      message.mimeType = ''
    }
    return message
  },

  toJSON(message: Link): unknown {
    const obj: any = {}
    message.uri !== undefined && (obj.uri = message.uri)
    message.mimeType !== undefined && (obj.mimeType = message.mimeType)
    return obj
  },

  fromPartial(object: DeepPartial<Link>): Link {
    const message = {...baseLink} as Link
    if (object.uri !== undefined && object.uri !== null) {
      message.uri = object.uri
    } else {
      message.uri = ''
    }
    if (object.mimeType !== undefined && object.mimeType !== null) {
      message.mimeType = object.mimeType
    } else {
      message.mimeType = ''
    }
    return message
  },
}

const baseBlock: object = {id: '', parent: '', type: 0, childListStyle: 0, children: ''}

export const Block = {
  encode(message: Block, writer: Writer = Writer.create()): Writer {
    if (message.id !== '') {
      writer.uint32(10).string(message.id)
    }
    if (message.parent !== '') {
      writer.uint32(18).string(message.parent)
    }
    if (message.type !== 0) {
      writer.uint32(24).int32(message.type)
    }
    for (const v of message.elements) {
      InlineElement.encode(v!, writer.uint32(34).fork()).ldelim()
    }
    if (message.childListStyle !== 0) {
      writer.uint32(40).int32(message.childListStyle)
    }
    for (const v of message.children) {
      writer.uint32(50).string(v!)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Block {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseBlock} as Block
    message.elements = []
    message.children = []
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string()
          break
        case 2:
          message.parent = reader.string()
          break
        case 3:
          message.type = reader.int32() as any
          break
        case 4:
          message.elements.push(InlineElement.decode(reader, reader.uint32()))
          break
        case 5:
          message.childListStyle = reader.int32() as any
          break
        case 6:
          message.children.push(reader.string())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Block {
    const message = {...baseBlock} as Block
    message.elements = []
    message.children = []
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id)
    } else {
      message.id = ''
    }
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = String(object.parent)
    } else {
      message.parent = ''
    }
    if (object.type !== undefined && object.type !== null) {
      message.type = block_TypeFromJSON(object.type)
    } else {
      message.type = 0
    }
    if (object.elements !== undefined && object.elements !== null) {
      for (const e of object.elements) {
        message.elements.push(InlineElement.fromJSON(e))
      }
    }
    if (object.childListStyle !== undefined && object.childListStyle !== null) {
      message.childListStyle = listStyleFromJSON(object.childListStyle)
    } else {
      message.childListStyle = 0
    }
    if (object.children !== undefined && object.children !== null) {
      for (const e of object.children) {
        message.children.push(String(e))
      }
    }
    return message
  },

  toJSON(message: Block): unknown {
    const obj: any = {}
    message.id !== undefined && (obj.id = message.id)
    message.parent !== undefined && (obj.parent = message.parent)
    message.type !== undefined && (obj.type = block_TypeToJSON(message.type))
    if (message.elements) {
      obj.elements = message.elements.map((e) => (e ? InlineElement.toJSON(e) : undefined))
    } else {
      obj.elements = []
    }
    message.childListStyle !== undefined && (obj.childListStyle = listStyleToJSON(message.childListStyle))
    if (message.children) {
      obj.children = message.children.map((e) => e)
    } else {
      obj.children = []
    }
    return obj
  },

  fromPartial(object: DeepPartial<Block>): Block {
    const message = {...baseBlock} as Block
    message.elements = []
    message.children = []
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id
    } else {
      message.id = ''
    }
    if (object.parent !== undefined && object.parent !== null) {
      message.parent = object.parent
    } else {
      message.parent = ''
    }
    if (object.type !== undefined && object.type !== null) {
      message.type = object.type
    } else {
      message.type = 0
    }
    if (object.elements !== undefined && object.elements !== null) {
      for (const e of object.elements) {
        message.elements.push(InlineElement.fromPartial(e))
      }
    }
    if (object.childListStyle !== undefined && object.childListStyle !== null) {
      message.childListStyle = object.childListStyle
    } else {
      message.childListStyle = 0
    }
    if (object.children !== undefined && object.children !== null) {
      for (const e of object.children) {
        message.children.push(e)
      }
    }
    return message
  },
}

const baseInlineElement: object = {}

export const InlineElement = {
  encode(message: InlineElement, writer: Writer = Writer.create()): Writer {
    if (message.textRun !== undefined) {
      TextRun.encode(message.textRun, writer.uint32(10).fork()).ldelim()
    }
    if (message.image !== undefined) {
      Image.encode(message.image, writer.uint32(18).fork()).ldelim()
    }
    if (message.quote !== undefined) {
      Quote.encode(message.quote, writer.uint32(26).fork()).ldelim()
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): InlineElement {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseInlineElement} as InlineElement
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.textRun = TextRun.decode(reader, reader.uint32())
          break
        case 2:
          message.image = Image.decode(reader, reader.uint32())
          break
        case 3:
          message.quote = Quote.decode(reader, reader.uint32())
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): InlineElement {
    const message = {...baseInlineElement} as InlineElement
    if (object.textRun !== undefined && object.textRun !== null) {
      message.textRun = TextRun.fromJSON(object.textRun)
    } else {
      message.textRun = undefined
    }
    if (object.image !== undefined && object.image !== null) {
      message.image = Image.fromJSON(object.image)
    } else {
      message.image = undefined
    }
    if (object.quote !== undefined && object.quote !== null) {
      message.quote = Quote.fromJSON(object.quote)
    } else {
      message.quote = undefined
    }
    return message
  },

  toJSON(message: InlineElement): unknown {
    const obj: any = {}
    message.textRun !== undefined && (obj.textRun = message.textRun ? TextRun.toJSON(message.textRun) : undefined)
    message.image !== undefined && (obj.image = message.image ? Image.toJSON(message.image) : undefined)
    message.quote !== undefined && (obj.quote = message.quote ? Quote.toJSON(message.quote) : undefined)
    return obj
  },

  fromPartial(object: DeepPartial<InlineElement>): InlineElement {
    const message = {...baseInlineElement} as InlineElement
    if (object.textRun !== undefined && object.textRun !== null) {
      message.textRun = TextRun.fromPartial(object.textRun)
    } else {
      message.textRun = undefined
    }
    if (object.image !== undefined && object.image !== null) {
      message.image = Image.fromPartial(object.image)
    } else {
      message.image = undefined
    }
    if (object.quote !== undefined && object.quote !== null) {
      message.quote = Quote.fromPartial(object.quote)
    } else {
      message.quote = undefined
    }
    return message
  },
}

const baseTextRun: object = {
  text: '',
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  blockquote: false,
  linkKey: '',
}

export const TextRun = {
  encode(message: TextRun, writer: Writer = Writer.create()): Writer {
    if (message.text !== '') {
      writer.uint32(10).string(message.text)
    }
    if (message.bold === true) {
      writer.uint32(16).bool(message.bold)
    }
    if (message.italic === true) {
      writer.uint32(24).bool(message.italic)
    }
    if (message.underline === true) {
      writer.uint32(32).bool(message.underline)
    }
    if (message.strikethrough === true) {
      writer.uint32(40).bool(message.strikethrough)
    }
    if (message.code === true) {
      writer.uint32(48).bool(message.code)
    }
    if (message.blockquote === true) {
      writer.uint32(56).bool(message.blockquote)
    }
    if (message.linkKey !== '') {
      writer.uint32(66).string(message.linkKey)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): TextRun {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseTextRun} as TextRun
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.text = reader.string()
          break
        case 2:
          message.bold = reader.bool()
          break
        case 3:
          message.italic = reader.bool()
          break
        case 4:
          message.underline = reader.bool()
          break
        case 5:
          message.strikethrough = reader.bool()
          break
        case 6:
          message.code = reader.bool()
          break
        case 7:
          message.blockquote = reader.bool()
          break
        case 8:
          message.linkKey = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): TextRun {
    const message = {...baseTextRun} as TextRun
    if (object.text !== undefined && object.text !== null) {
      message.text = String(object.text)
    } else {
      message.text = ''
    }
    if (object.bold !== undefined && object.bold !== null) {
      message.bold = Boolean(object.bold)
    } else {
      message.bold = false
    }
    if (object.italic !== undefined && object.italic !== null) {
      message.italic = Boolean(object.italic)
    } else {
      message.italic = false
    }
    if (object.underline !== undefined && object.underline !== null) {
      message.underline = Boolean(object.underline)
    } else {
      message.underline = false
    }
    if (object.strikethrough !== undefined && object.strikethrough !== null) {
      message.strikethrough = Boolean(object.strikethrough)
    } else {
      message.strikethrough = false
    }
    if (object.code !== undefined && object.code !== null) {
      message.code = Boolean(object.code)
    } else {
      message.code = false
    }
    if (object.blockquote !== undefined && object.blockquote !== null) {
      message.blockquote = Boolean(object.blockquote)
    } else {
      message.blockquote = false
    }
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = String(object.linkKey)
    } else {
      message.linkKey = ''
    }
    return message
  },

  toJSON(message: TextRun): unknown {
    const obj: any = {}
    message.text !== undefined && (obj.text = message.text)
    message.bold !== undefined && (obj.bold = message.bold)
    message.italic !== undefined && (obj.italic = message.italic)
    message.underline !== undefined && (obj.underline = message.underline)
    message.strikethrough !== undefined && (obj.strikethrough = message.strikethrough)
    message.code !== undefined && (obj.code = message.code)
    message.blockquote !== undefined && (obj.blockquote = message.blockquote)
    message.linkKey !== undefined && (obj.linkKey = message.linkKey)
    return obj
  },

  fromPartial(object: DeepPartial<TextRun>): TextRun {
    const message = {...baseTextRun} as TextRun
    if (object.text !== undefined && object.text !== null) {
      message.text = object.text
    } else {
      message.text = ''
    }
    if (object.bold !== undefined && object.bold !== null) {
      message.bold = object.bold
    } else {
      message.bold = false
    }
    if (object.italic !== undefined && object.italic !== null) {
      message.italic = object.italic
    } else {
      message.italic = false
    }
    if (object.underline !== undefined && object.underline !== null) {
      message.underline = object.underline
    } else {
      message.underline = false
    }
    if (object.strikethrough !== undefined && object.strikethrough !== null) {
      message.strikethrough = object.strikethrough
    } else {
      message.strikethrough = false
    }
    if (object.code !== undefined && object.code !== null) {
      message.code = object.code
    } else {
      message.code = false
    }
    if (object.blockquote !== undefined && object.blockquote !== null) {
      message.blockquote = object.blockquote
    } else {
      message.blockquote = false
    }
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = object.linkKey
    } else {
      message.linkKey = ''
    }
    return message
  },
}

const baseImage: object = {altText: '', linkKey: ''}

export const Image = {
  encode(message: Image, writer: Writer = Writer.create()): Writer {
    if (message.altText !== '') {
      writer.uint32(10).string(message.altText)
    }
    if (message.linkKey !== '') {
      writer.uint32(18).string(message.linkKey)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Image {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseImage} as Image
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.altText = reader.string()
          break
        case 2:
          message.linkKey = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Image {
    const message = {...baseImage} as Image
    if (object.altText !== undefined && object.altText !== null) {
      message.altText = String(object.altText)
    } else {
      message.altText = ''
    }
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = String(object.linkKey)
    } else {
      message.linkKey = ''
    }
    return message
  },

  toJSON(message: Image): unknown {
    const obj: any = {}
    message.altText !== undefined && (obj.altText = message.altText)
    message.linkKey !== undefined && (obj.linkKey = message.linkKey)
    return obj
  },

  fromPartial(object: DeepPartial<Image>): Image {
    const message = {...baseImage} as Image
    if (object.altText !== undefined && object.altText !== null) {
      message.altText = object.altText
    } else {
      message.altText = ''
    }
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = object.linkKey
    } else {
      message.linkKey = ''
    }
    return message
  },
}

const baseQuote: object = {linkKey: '', startOffset: 0, endOffset: 0}

export const Quote = {
  encode(message: Quote, writer: Writer = Writer.create()): Writer {
    if (message.linkKey !== '') {
      writer.uint32(10).string(message.linkKey)
    }
    if (message.startOffset !== 0) {
      writer.uint32(16).int32(message.startOffset)
    }
    if (message.endOffset !== 0) {
      writer.uint32(24).int32(message.endOffset)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): Quote {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseQuote} as Quote
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.linkKey = reader.string()
          break
        case 2:
          message.startOffset = reader.int32()
          break
        case 3:
          message.endOffset = reader.int32()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): Quote {
    const message = {...baseQuote} as Quote
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = String(object.linkKey)
    } else {
      message.linkKey = ''
    }
    if (object.startOffset !== undefined && object.startOffset !== null) {
      message.startOffset = Number(object.startOffset)
    } else {
      message.startOffset = 0
    }
    if (object.endOffset !== undefined && object.endOffset !== null) {
      message.endOffset = Number(object.endOffset)
    } else {
      message.endOffset = 0
    }
    return message
  },

  toJSON(message: Quote): unknown {
    const obj: any = {}
    message.linkKey !== undefined && (obj.linkKey = message.linkKey)
    message.startOffset !== undefined && (obj.startOffset = message.startOffset)
    message.endOffset !== undefined && (obj.endOffset = message.endOffset)
    return obj
  },

  fromPartial(object: DeepPartial<Quote>): Quote {
    const message = {...baseQuote} as Quote
    if (object.linkKey !== undefined && object.linkKey !== null) {
      message.linkKey = object.linkKey
    } else {
      message.linkKey = ''
    }
    if (object.startOffset !== undefined && object.startOffset !== null) {
      message.startOffset = object.startOffset
    } else {
      message.startOffset = 0
    }
    if (object.endOffset !== undefined && object.endOffset !== null) {
      message.endOffset = object.endOffset
    } else {
      message.endOffset = 0
    }
    return message
  },
}

const baseDocumentPublished: object = {documentId: '', title: '', subtitle: ''}

export const DocumentPublished = {
  encode(message: DocumentPublished, writer: Writer = Writer.create()): Writer {
    if (message.documentId !== '') {
      writer.uint32(10).string(message.documentId)
    }
    if (message.title !== '') {
      writer.uint32(18).string(message.title)
    }
    if (message.subtitle !== '') {
      writer.uint32(26).string(message.subtitle)
    }
    return writer
  },

  decode(input: Reader | Uint8Array, length?: number): DocumentPublished {
    const reader = input instanceof Reader ? input : new Reader(input)
    let end = length === undefined ? reader.len : reader.pos + length
    const message = {...baseDocumentPublished} as DocumentPublished
    while (reader.pos < end) {
      const tag = reader.uint32()
      switch (tag >>> 3) {
        case 1:
          message.documentId = reader.string()
          break
        case 2:
          message.title = reader.string()
          break
        case 3:
          message.subtitle = reader.string()
          break
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  },

  fromJSON(object: any): DocumentPublished {
    const message = {...baseDocumentPublished} as DocumentPublished
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = String(object.documentId)
    } else {
      message.documentId = ''
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = String(object.title)
    } else {
      message.title = ''
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = String(object.subtitle)
    } else {
      message.subtitle = ''
    }
    return message
  },

  toJSON(message: DocumentPublished): unknown {
    const obj: any = {}
    message.documentId !== undefined && (obj.documentId = message.documentId)
    message.title !== undefined && (obj.title = message.title)
    message.subtitle !== undefined && (obj.subtitle = message.subtitle)
    return obj
  },

  fromPartial(object: DeepPartial<DocumentPublished>): DocumentPublished {
    const message = {...baseDocumentPublished} as DocumentPublished
    if (object.documentId !== undefined && object.documentId !== null) {
      message.documentId = object.documentId
    } else {
      message.documentId = ''
    }
    if (object.title !== undefined && object.title !== null) {
      message.title = object.title
    } else {
      message.title = ''
    }
    if (object.subtitle !== undefined && object.subtitle !== null) {
      message.subtitle = object.subtitle
    } else {
      message.subtitle = ''
    }
    return message
  },
}

/**
 * Drafts service is separate from Publications for the access-control purposes,
 * but overall there're not many differences between the two.
 */
export interface Drafts {
  /** Creates a new draft with a new permanent document ID. */
  createDraft(request: DeepPartial<CreateDraftRequest>, metadata?: grpc.Metadata): Promise<Document>
  /** Deletes a draft by its document ID. */
  deleteDraft(request: DeepPartial<DeleteDraftRequest>, metadata?: grpc.Metadata): Promise<Empty>
  /** Gets a single draft if exists. */
  getDraft(request: DeepPartial<GetDraftRequest>, metadata?: grpc.Metadata): Promise<Document>
  /** Updates a draft instance. Supports partial updates. */
  updateDraft(request: DeepPartial<UpdateDraftRequest>, metadata?: grpc.Metadata): Promise<Document>
  /** List currently stored drafts. */
  listDrafts(request: DeepPartial<ListDraftsRequest>, metadata?: grpc.Metadata): Promise<ListDraftsResponse>
  /** Publishes a draft. I.e. draft will become a publication, and will no longer appear in drafts section. */
  publishDraft(request: DeepPartial<PublishDraftRequest>, metadata?: grpc.Metadata): Promise<PublishDraftResponse>
}

export class DraftsClientImpl implements Drafts {
  private readonly rpc: Rpc

  constructor(rpc: Rpc) {
    this.rpc = rpc
    this.CreateDraft = this.CreateDraft.bind(this)
    this.DeleteDraft = this.DeleteDraft.bind(this)
    this.GetDraft = this.GetDraft.bind(this)
    this.UpdateDraft = this.UpdateDraft.bind(this)
    this.ListDrafts = this.ListDrafts.bind(this)
    this.PublishDraft = this.PublishDraft.bind(this)
  }

  CreateDraft(request: DeepPartial<CreateDraftRequest>, metadata?: grpc.Metadata): Promise<Document> {
    return this.rpc.unary(DraftsCreateDraftDesc, CreateDraftRequest.fromPartial(request), metadata)
  }

  DeleteDraft(request: DeepPartial<DeleteDraftRequest>, metadata?: grpc.Metadata): Promise<Empty> {
    return this.rpc.unary(DraftsDeleteDraftDesc, DeleteDraftRequest.fromPartial(request), metadata)
  }

  GetDraft(request: DeepPartial<GetDraftRequest>, metadata?: grpc.Metadata): Promise<Document> {
    return this.rpc.unary(DraftsGetDraftDesc, GetDraftRequest.fromPartial(request), metadata)
  }

  UpdateDraft(request: DeepPartial<UpdateDraftRequest>, metadata?: grpc.Metadata): Promise<Document> {
    return this.rpc.unary(DraftsUpdateDraftDesc, UpdateDraftRequest.fromPartial(request), metadata)
  }

  ListDrafts(request: DeepPartial<ListDraftsRequest>, metadata?: grpc.Metadata): Promise<ListDraftsResponse> {
    return this.rpc.unary(DraftsListDraftsDesc, ListDraftsRequest.fromPartial(request), metadata)
  }

  PublishDraft(request: DeepPartial<PublishDraftRequest>, metadata?: grpc.Metadata): Promise<PublishDraftResponse> {
    return this.rpc.unary(DraftsPublishDraftDesc, PublishDraftRequest.fromPartial(request), metadata)
  }
}

export const DraftsDesc = {
  serviceName: 'com.mintter.documents.v1alpha.Drafts',
}

export const DraftsCreateDraftDesc: UnaryMethodDefinitionish = {
  methodName: 'CreateDraft',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return CreateDraftRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Document.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DraftsDeleteDraftDesc: UnaryMethodDefinitionish = {
  methodName: 'DeleteDraft',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return DeleteDraftRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Empty.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DraftsGetDraftDesc: UnaryMethodDefinitionish = {
  methodName: 'GetDraft',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetDraftRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Document.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DraftsUpdateDraftDesc: UnaryMethodDefinitionish = {
  methodName: 'UpdateDraft',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return UpdateDraftRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Document.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DraftsListDraftsDesc: UnaryMethodDefinitionish = {
  methodName: 'ListDrafts',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListDraftsRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListDraftsResponse.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const DraftsPublishDraftDesc: UnaryMethodDefinitionish = {
  methodName: 'PublishDraft',
  service: DraftsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return PublishDraftRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...PublishDraftResponse.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

/** Publications service provides access to the publications. */
export interface Publications {
  /** Gets a single publication. */
  getPublication(request: DeepPartial<GetPublicationRequest>, metadata?: grpc.Metadata): Promise<Publication>
  /** Deletes a publication from the local node. It removes all the patches corresponding to a document. */
  deletePublication(request: DeepPartial<DeletePublicationRequest>, metadata?: grpc.Metadata): Promise<Empty>
  /** Lists stored publications. */
  listPublications(
    request: DeepPartial<ListPublicationsRequest>,
    metadata?: grpc.Metadata,
  ): Promise<ListPublicationsResponse>
}

export class PublicationsClientImpl implements Publications {
  private readonly rpc: Rpc

  constructor(rpc: Rpc) {
    this.rpc = rpc
    this.GetPublication = this.GetPublication.bind(this)
    this.DeletePublication = this.DeletePublication.bind(this)
    this.ListPublications = this.ListPublications.bind(this)
  }

  GetPublication(request: DeepPartial<GetPublicationRequest>, metadata?: grpc.Metadata): Promise<Publication> {
    return this.rpc.unary(PublicationsGetPublicationDesc, GetPublicationRequest.fromPartial(request), metadata)
  }

  DeletePublication(request: DeepPartial<DeletePublicationRequest>, metadata?: grpc.Metadata): Promise<Empty> {
    return this.rpc.unary(PublicationsDeletePublicationDesc, DeletePublicationRequest.fromPartial(request), metadata)
  }

  ListPublications(
    request: DeepPartial<ListPublicationsRequest>,
    metadata?: grpc.Metadata,
  ): Promise<ListPublicationsResponse> {
    return this.rpc.unary(PublicationsListPublicationsDesc, ListPublicationsRequest.fromPartial(request), metadata)
  }
}

export const PublicationsDesc = {
  serviceName: 'com.mintter.documents.v1alpha.Publications',
}

export const PublicationsGetPublicationDesc: UnaryMethodDefinitionish = {
  methodName: 'GetPublication',
  service: PublicationsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetPublicationRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Publication.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const PublicationsDeletePublicationDesc: UnaryMethodDefinitionish = {
  methodName: 'DeletePublication',
  service: PublicationsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return DeletePublicationRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Empty.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

export const PublicationsListPublicationsDesc: UnaryMethodDefinitionish = {
  methodName: 'ListPublications',
  service: PublicationsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListPublicationsRequest.encode(this).finish()
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListPublicationsResponse.decode(data),
        toObject() {
          return this
        },
      }
    },
  } as any,
}

interface UnaryMethodDefinitionishR extends grpc.UnaryMethodDefinition<any, any> {
  requestStream: any
  responseStream: any
}

type UnaryMethodDefinitionish = UnaryMethodDefinitionishR

interface Rpc {
  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpc.Metadata | undefined,
  ): Promise<any>
}

export class GrpcWebImpl {
  private host: string
  private options: {
    transport?: grpc.TransportFactory

    debug?: boolean
    metadata?: grpc.Metadata
  }

  constructor(
    host: string,
    options: {
      transport?: grpc.TransportFactory

      debug?: boolean
      metadata?: grpc.Metadata
    },
  ) {
    this.host = host
    this.options = options
  }

  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined,
  ): Promise<any> {
    const request = {..._request, ...methodDesc.requestType}
    const maybeCombinedMetadata =
      metadata && this.options.metadata
        ? new BrowserHeaders({...this.options?.metadata.headersMap, ...metadata?.headersMap})
        : metadata || this.options.metadata
    return new Promise((resolve, reject) => {
      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: maybeCombinedMetadata,
        transport: this.options.transport,
        debug: this.options.debug,
        onEnd: function (response) {
          if (response.status === grpc.Code.OK) {
            resolve(response.message)
          } else {
            const err = new Error(response.statusMessage) as any
            err.code = response.status
            err.metadata = response.trailers
            reject(err)
          }
        },
      })
    })
  }
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined
type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? {[K in keyof T]?: DeepPartial<T[K]>}
  : Partial<T>

function toTimestamp(date: Date): Timestamp {
  const seconds = date.getTime() / 1_000
  const nanos = (date.getTime() % 1_000) * 1_000_000
  return {seconds, nanos}
}

function fromTimestamp(t: Timestamp): Date {
  let millis = t.seconds * 1_000
  millis += t.nanos / 1_000_000
  return new Date(millis)
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof Date) {
    return o
  } else if (typeof o === 'string') {
    return new Date(o)
  } else {
    return fromTimestamp(Timestamp.fromJSON(o))
  }
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any
  configure()
}
