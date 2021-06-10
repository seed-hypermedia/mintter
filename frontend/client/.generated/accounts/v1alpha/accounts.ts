/* eslint-disable */
//@ts-nocheck
import { util, configure, Writer, Reader } from "protobufjs/minimal";
import * as Long from "long";
import { grpc } from "@improbable-eng/grpc-web";
import { BrowserHeaders } from "browser-headers";
import { Timestamp } from "../../google/protobuf/timestamp";

export const protobufPackage = "com.mintter.accounts.v1alpha";

export interface GetAccountRequest {
  /** ID of the Account to be looked up. If empty - our own account will be returned. */
  id: string;
}

export interface ListAccountsRequest {
  pageSize: number;
  pageToken: string;
}

export interface ListAccountsResponse {
  accounts: Account[];
  nextPageToken: string;
}

export interface StartAccountDiscoveryRequest {
  accountId: string;
}

export interface StartAccountDiscoveryResponse { }

export interface Account {
  /** Mintter Account ID. */
  id: string;
  /** Profile information of this account. */
  profile: Profile | undefined;
  /** List of known devices of this Account. */
  devices: { [key: string]: Device };
}

export interface Account_DevicesEntry {
  key: string;
  value: Device | undefined;
}

export interface Profile {
  alias: string;
  bio: string;
  email: string;
}

export interface Device {
  /** CID-encoded Peer ID of this device. */
  peerId: string;
  /** Time when this device was registered. */
  registerTime: Date | undefined;
}

export interface DeviceRegistered {
  proof: Uint8Array;
}

export interface ProfileUpdated {
  profile: Profile | undefined;
}

const baseGetAccountRequest: object = { id: "" };

export const GetAccountRequest = {
  encode(message: GetAccountRequest, writer: Writer = Writer.create()): Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): GetAccountRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseGetAccountRequest } as GetAccountRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): GetAccountRequest {
    const message = { ...baseGetAccountRequest } as GetAccountRequest;
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id);
    } else {
      message.id = "";
    }
    return message;
  },

  toJSON(message: GetAccountRequest): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    return obj;
  },

  fromPartial(object: DeepPartial<GetAccountRequest>): GetAccountRequest {
    const message = { ...baseGetAccountRequest } as GetAccountRequest;
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id;
    } else {
      message.id = "";
    }
    return message;
  },
};

const baseListAccountsRequest: object = { pageSize: 0, pageToken: "" };

export const ListAccountsRequest = {
  encode(
    message: ListAccountsRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.pageSize !== 0) {
      writer.uint32(8).int32(message.pageSize);
    }
    if (message.pageToken !== "") {
      writer.uint32(18).string(message.pageToken);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListAccountsRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListAccountsRequest } as ListAccountsRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pageSize = reader.int32();
          break;
        case 2:
          message.pageToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListAccountsRequest {
    const message = { ...baseListAccountsRequest } as ListAccountsRequest;
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = Number(object.pageSize);
    } else {
      message.pageSize = 0;
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = String(object.pageToken);
    } else {
      message.pageToken = "";
    }
    return message;
  },

  toJSON(message: ListAccountsRequest): unknown {
    const obj: any = {};
    message.pageSize !== undefined && (obj.pageSize = message.pageSize);
    message.pageToken !== undefined && (obj.pageToken = message.pageToken);
    return obj;
  },

  fromPartial(object: DeepPartial<ListAccountsRequest>): ListAccountsRequest {
    const message = { ...baseListAccountsRequest } as ListAccountsRequest;
    if (object.pageSize !== undefined && object.pageSize !== null) {
      message.pageSize = object.pageSize;
    } else {
      message.pageSize = 0;
    }
    if (object.pageToken !== undefined && object.pageToken !== null) {
      message.pageToken = object.pageToken;
    } else {
      message.pageToken = "";
    }
    return message;
  },
};

const baseListAccountsResponse: object = { nextPageToken: "" };

export const ListAccountsResponse = {
  encode(
    message: ListAccountsResponse,
    writer: Writer = Writer.create()
  ): Writer {
    for (const v of message.accounts) {
      Account.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPageToken !== "") {
      writer.uint32(18).string(message.nextPageToken);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ListAccountsResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseListAccountsResponse } as ListAccountsResponse;
    message.accounts = [];
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.accounts.push(Account.decode(reader, reader.uint32()));
          break;
        case 2:
          message.nextPageToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ListAccountsResponse {
    const message = { ...baseListAccountsResponse } as ListAccountsResponse;
    message.accounts = [];
    if (object.accounts !== undefined && object.accounts !== null) {
      for (const e of object.accounts) {
        message.accounts.push(Account.fromJSON(e));
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = String(object.nextPageToken);
    } else {
      message.nextPageToken = "";
    }
    return message;
  },

  toJSON(message: ListAccountsResponse): unknown {
    const obj: any = {};
    if (message.accounts) {
      obj.accounts = message.accounts.map((e) =>
        e ? Account.toJSON(e) : undefined
      );
    } else {
      obj.accounts = [];
    }
    message.nextPageToken !== undefined &&
      (obj.nextPageToken = message.nextPageToken);
    return obj;
  },

  fromPartial(object: DeepPartial<ListAccountsResponse>): ListAccountsResponse {
    const message = { ...baseListAccountsResponse } as ListAccountsResponse;
    message.accounts = [];
    if (object.accounts !== undefined && object.accounts !== null) {
      for (const e of object.accounts) {
        message.accounts.push(Account.fromPartial(e));
      }
    }
    if (object.nextPageToken !== undefined && object.nextPageToken !== null) {
      message.nextPageToken = object.nextPageToken;
    } else {
      message.nextPageToken = "";
    }
    return message;
  },
};

const baseStartAccountDiscoveryRequest: object = { accountId: "" };

export const StartAccountDiscoveryRequest = {
  encode(
    message: StartAccountDiscoveryRequest,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.accountId !== "") {
      writer.uint32(10).string(message.accountId);
    }
    return writer;
  },

  decode(
    input: Reader | Uint8Array,
    length?: number
  ): StartAccountDiscoveryRequest {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = {
      ...baseStartAccountDiscoveryRequest,
    } as StartAccountDiscoveryRequest;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.accountId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): StartAccountDiscoveryRequest {
    const message = {
      ...baseStartAccountDiscoveryRequest,
    } as StartAccountDiscoveryRequest;
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = String(object.accountId);
    } else {
      message.accountId = "";
    }
    return message;
  },

  toJSON(message: StartAccountDiscoveryRequest): unknown {
    const obj: any = {};
    message.accountId !== undefined && (obj.accountId = message.accountId);
    return obj;
  },

  fromPartial(
    object: DeepPartial<StartAccountDiscoveryRequest>
  ): StartAccountDiscoveryRequest {
    const message = {
      ...baseStartAccountDiscoveryRequest,
    } as StartAccountDiscoveryRequest;
    if (object.accountId !== undefined && object.accountId !== null) {
      message.accountId = object.accountId;
    } else {
      message.accountId = "";
    }
    return message;
  },
};

const baseStartAccountDiscoveryResponse: object = {};

export const StartAccountDiscoveryResponse = {
  encode(
    _: StartAccountDiscoveryResponse,
    writer: Writer = Writer.create()
  ): Writer {
    return writer;
  },

  decode(
    input: Reader | Uint8Array,
    length?: number
  ): StartAccountDiscoveryResponse {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = {
      ...baseStartAccountDiscoveryResponse,
    } as StartAccountDiscoveryResponse;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(_: any): StartAccountDiscoveryResponse {
    const message = {
      ...baseStartAccountDiscoveryResponse,
    } as StartAccountDiscoveryResponse;
    return message;
  },

  toJSON(_: StartAccountDiscoveryResponse): unknown {
    const obj: any = {};
    return obj;
  },

  fromPartial(
    _: DeepPartial<StartAccountDiscoveryResponse>
  ): StartAccountDiscoveryResponse {
    const message = {
      ...baseStartAccountDiscoveryResponse,
    } as StartAccountDiscoveryResponse;
    return message;
  },
};

const baseAccount: object = { id: "" };

export const Account = {
  encode(message: Account, writer: Writer = Writer.create()): Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.profile !== undefined) {
      Profile.encode(message.profile, writer.uint32(18).fork()).ldelim();
    }
    Object.entries(message.devices).forEach(([key, value]) => {
      Account_DevicesEntry.encode(
        { key: key as any, value },
        writer.uint32(26).fork()
      ).ldelim();
    });
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Account {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseAccount } as Account;
    message.devices = {};
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.profile = Profile.decode(reader, reader.uint32());
          break;
        case 3:
          const entry3 = Account_DevicesEntry.decode(reader, reader.uint32());
          if (entry3.value !== undefined) {
            message.devices[entry3.key] = entry3.value;
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Account {
    const message = { ...baseAccount } as Account;
    message.devices = {};
    if (object.id !== undefined && object.id !== null) {
      message.id = String(object.id);
    } else {
      message.id = "";
    }
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromJSON(object.profile);
    } else {
      message.profile = undefined;
    }
    if (object.devices !== undefined && object.devices !== null) {
      Object.entries(object.devices).forEach(([key, value]) => {
        message.devices[key] = Device.fromJSON(value);
      });
    }
    return message;
  },

  toJSON(message: Account): unknown {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.profile !== undefined &&
      (obj.profile = message.profile
        ? Profile.toJSON(message.profile)
        : undefined);
    obj.devices = {};
    if (message.devices) {
      Object.entries(message.devices).forEach(([k, v]) => {
        obj.devices[k] = Device.toJSON(v);
      });
    }
    return obj;
  },

  fromPartial(object: DeepPartial<Account>): Account {
    const message = { ...baseAccount } as Account;
    message.devices = {};
    if (object.id !== undefined && object.id !== null) {
      message.id = object.id;
    } else {
      message.id = "";
    }
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromPartial(object.profile);
    } else {
      message.profile = undefined;
    }
    if (object.devices !== undefined && object.devices !== null) {
      Object.entries(object.devices).forEach(([key, value]) => {
        if (value !== undefined) {
          message.devices[key] = Device.fromPartial(value);
        }
      });
    }
    return message;
  },
};

const baseAccount_DevicesEntry: object = { key: "" };

export const Account_DevicesEntry = {
  encode(
    message: Account_DevicesEntry,
    writer: Writer = Writer.create()
  ): Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      Device.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Account_DevicesEntry {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseAccount_DevicesEntry } as Account_DevicesEntry;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = Device.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Account_DevicesEntry {
    const message = { ...baseAccount_DevicesEntry } as Account_DevicesEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = String(object.key);
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Device.fromJSON(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },

  toJSON(message: Account_DevicesEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = message.value ? Device.toJSON(message.value) : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<Account_DevicesEntry>): Account_DevicesEntry {
    const message = { ...baseAccount_DevicesEntry } as Account_DevicesEntry;
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    } else {
      message.key = "";
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = Device.fromPartial(object.value);
    } else {
      message.value = undefined;
    }
    return message;
  },
};

const baseProfile: object = { alias: "", bio: "", email: "" };

export const Profile = {
  encode(message: Profile, writer: Writer = Writer.create()): Writer {
    if (message.alias !== "") {
      writer.uint32(10).string(message.alias);
    }
    if (message.bio !== "") {
      writer.uint32(18).string(message.bio);
    }
    if (message.email !== "") {
      writer.uint32(26).string(message.email);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Profile {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseProfile } as Profile;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.alias = reader.string();
          break;
        case 2:
          message.bio = reader.string();
          break;
        case 3:
          message.email = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Profile {
    const message = { ...baseProfile } as Profile;
    if (object.alias !== undefined && object.alias !== null) {
      message.alias = String(object.alias);
    } else {
      message.alias = "";
    }
    if (object.bio !== undefined && object.bio !== null) {
      message.bio = String(object.bio);
    } else {
      message.bio = "";
    }
    if (object.email !== undefined && object.email !== null) {
      message.email = String(object.email);
    } else {
      message.email = "";
    }
    return message;
  },

  toJSON(message: Profile): unknown {
    const obj: any = {};
    message.alias !== undefined && (obj.alias = message.alias);
    message.bio !== undefined && (obj.bio = message.bio);
    message.email !== undefined && (obj.email = message.email);
    return obj;
  },

  fromPartial(object: DeepPartial<Profile>): Profile {
    const message = { ...baseProfile } as Profile;
    if (object.alias !== undefined && object.alias !== null) {
      message.alias = object.alias;
    } else {
      message.alias = "";
    }
    if (object.bio !== undefined && object.bio !== null) {
      message.bio = object.bio;
    } else {
      message.bio = "";
    }
    if (object.email !== undefined && object.email !== null) {
      message.email = object.email;
    } else {
      message.email = "";
    }
    return message;
  },
};

const baseDevice: object = { peerId: "" };

export const Device = {
  encode(message: Device, writer: Writer = Writer.create()): Writer {
    if (message.peerId !== "") {
      writer.uint32(10).string(message.peerId);
    }
    if (message.registerTime !== undefined) {
      Timestamp.encode(
        toTimestamp(message.registerTime),
        writer.uint32(18).fork()
      ).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): Device {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseDevice } as Device;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.peerId = reader.string();
          break;
        case 2:
          message.registerTime = fromTimestamp(
            Timestamp.decode(reader, reader.uint32())
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): Device {
    const message = { ...baseDevice } as Device;
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = String(object.peerId);
    } else {
      message.peerId = "";
    }
    if (object.registerTime !== undefined && object.registerTime !== null) {
      message.registerTime = fromJsonTimestamp(object.registerTime);
    } else {
      message.registerTime = undefined;
    }
    return message;
  },

  toJSON(message: Device): unknown {
    const obj: any = {};
    message.peerId !== undefined && (obj.peerId = message.peerId);
    message.registerTime !== undefined &&
      (obj.registerTime = message.registerTime.toISOString());
    return obj;
  },

  fromPartial(object: DeepPartial<Device>): Device {
    const message = { ...baseDevice } as Device;
    if (object.peerId !== undefined && object.peerId !== null) {
      message.peerId = object.peerId;
    } else {
      message.peerId = "";
    }
    if (object.registerTime !== undefined && object.registerTime !== null) {
      message.registerTime = object.registerTime;
    } else {
      message.registerTime = undefined;
    }
    return message;
  },
};

const baseDeviceRegistered: object = {};

export const DeviceRegistered = {
  encode(message: DeviceRegistered, writer: Writer = Writer.create()): Writer {
    if (message.proof.length !== 0) {
      writer.uint32(10).bytes(message.proof);
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): DeviceRegistered {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseDeviceRegistered } as DeviceRegistered;
    message.proof = new Uint8Array();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.proof = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): DeviceRegistered {
    const message = { ...baseDeviceRegistered } as DeviceRegistered;
    message.proof = new Uint8Array();
    if (object.proof !== undefined && object.proof !== null) {
      message.proof = bytesFromBase64(object.proof);
    }
    return message;
  },

  toJSON(message: DeviceRegistered): unknown {
    const obj: any = {};
    message.proof !== undefined &&
      (obj.proof = base64FromBytes(
        message.proof !== undefined ? message.proof : new Uint8Array()
      ));
    return obj;
  },

  fromPartial(object: DeepPartial<DeviceRegistered>): DeviceRegistered {
    const message = { ...baseDeviceRegistered } as DeviceRegistered;
    if (object.proof !== undefined && object.proof !== null) {
      message.proof = object.proof;
    } else {
      message.proof = new Uint8Array();
    }
    return message;
  },
};

const baseProfileUpdated: object = {};

export const ProfileUpdated = {
  encode(message: ProfileUpdated, writer: Writer = Writer.create()): Writer {
    if (message.profile !== undefined) {
      Profile.encode(message.profile, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: Reader | Uint8Array, length?: number): ProfileUpdated {
    const reader = input instanceof Reader ? input : new Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = { ...baseProfileUpdated } as ProfileUpdated;
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.profile = Profile.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): ProfileUpdated {
    const message = { ...baseProfileUpdated } as ProfileUpdated;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromJSON(object.profile);
    } else {
      message.profile = undefined;
    }
    return message;
  },

  toJSON(message: ProfileUpdated): unknown {
    const obj: any = {};
    message.profile !== undefined &&
      (obj.profile = message.profile
        ? Profile.toJSON(message.profile)
        : undefined);
    return obj;
  },

  fromPartial(object: DeepPartial<ProfileUpdated>): ProfileUpdated {
    const message = { ...baseProfileUpdated } as ProfileUpdated;
    if (object.profile !== undefined && object.profile !== null) {
      message.profile = Profile.fromPartial(object.profile);
    } else {
      message.profile = undefined;
    }
    return message;
  },
};

/** Accounts API service. */
export interface Accounts {
  /**
   * Lookup an Account information across the already known accounts.
   * Can also be used to retrieve our own account.
   */
  getAccount(
    request: DeepPartial<GetAccountRequest>,
    metadata?: grpc.Metadata
  ): Promise<Account>;
  /** Update Profile information of our own Account. */
  updateProfile(
    request: DeepPartial<Profile>,
    metadata?: grpc.Metadata
  ): Promise<Account>;
  /**
   * List accounts known to the backend (excluding our own account). New accounts can be discovered naturally by
   * interacting with the network, or users can ask to discover specific accounts using
   * the Networking API.
   */
  listAccounts(
    request: DeepPartial<ListAccountsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListAccountsResponse>;
  /** Starts looking for peers providing information about another Account ID. */
  startAccountDiscovery(
    request: DeepPartial<StartAccountDiscoveryRequest>,
    metadata?: grpc.Metadata
  ): Promise<StartAccountDiscoveryResponse>;
}

export class AccountsClientImpl implements Accounts {
  private readonly rpc: Rpc;

  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.GetAccount = this.GetAccount.bind(this);
    this.UpdateProfile = this.UpdateProfile.bind(this);
    this.ListAccounts = this.ListAccounts.bind(this);
    this.StartAccountDiscovery = this.StartAccountDiscovery.bind(this);
  }

  GetAccount(
    request: DeepPartial<GetAccountRequest>,
    metadata?: grpc.Metadata
  ): Promise<Account> {
    return this.rpc.unary(
      AccountsGetAccountDesc,
      GetAccountRequest.fromPartial(request),
      metadata
    );
  }

  UpdateProfile(
    request: DeepPartial<Profile>,
    metadata?: grpc.Metadata
  ): Promise<Account> {
    return this.rpc.unary(
      AccountsUpdateProfileDesc,
      Profile.fromPartial(request),
      metadata
    );
  }

  ListAccounts(
    request: DeepPartial<ListAccountsRequest>,
    metadata?: grpc.Metadata
  ): Promise<ListAccountsResponse> {
    return this.rpc.unary(
      AccountsListAccountsDesc,
      ListAccountsRequest.fromPartial(request),
      metadata
    );
  }

  StartAccountDiscovery(
    request: DeepPartial<StartAccountDiscoveryRequest>,
    metadata?: grpc.Metadata
  ): Promise<StartAccountDiscoveryResponse> {
    return this.rpc.unary(
      AccountsStartAccountDiscoveryDesc,
      StartAccountDiscoveryRequest.fromPartial(request),
      metadata
    );
  }
}

export const AccountsDesc = {
  serviceName: "com.mintter.accounts.v1alpha.Accounts",
};

export const AccountsGetAccountDesc: UnaryMethodDefinitionish = {
  methodName: "GetAccount",
  service: AccountsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return GetAccountRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Account.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const AccountsUpdateProfileDesc: UnaryMethodDefinitionish = {
  methodName: "UpdateProfile",
  service: AccountsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return Profile.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...Account.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const AccountsListAccountsDesc: UnaryMethodDefinitionish = {
  methodName: "ListAccounts",
  service: AccountsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return ListAccountsRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...ListAccountsResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

export const AccountsStartAccountDiscoveryDesc: UnaryMethodDefinitionish = {
  methodName: "StartAccountDiscovery",
  service: AccountsDesc,
  requestStream: false,
  responseStream: false,
  requestType: {
    serializeBinary() {
      return StartAccountDiscoveryRequest.encode(this).finish();
    },
  } as any,
  responseType: {
    deserializeBinary(data: Uint8Array) {
      return {
        ...StartAccountDiscoveryResponse.decode(data),
        toObject() {
          return this;
        },
      };
    },
  } as any,
};

interface UnaryMethodDefinitionishR
  extends grpc.UnaryMethodDefinition<any, any> {
  requestStream: any;
  responseStream: any;
}

type UnaryMethodDefinitionish = UnaryMethodDefinitionishR;

interface Rpc {
  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any>;
}

export class GrpcWebImpl {
  private host: string;
  private options: {
    transport?: grpc.TransportFactory;

    debug?: boolean;
    metadata?: grpc.Metadata;
  };

  constructor(
    host: string,
    options: {
      transport?: grpc.TransportFactory;

      debug?: boolean;
      metadata?: grpc.Metadata;
    }
  ) {
    this.host = host;
    this.options = options;
  }

  unary<T extends UnaryMethodDefinitionish>(
    methodDesc: T,
    _request: any,
    metadata: grpc.Metadata | undefined
  ): Promise<any> {
    const request = { ..._request, ...methodDesc.requestType };
    const maybeCombinedMetadata =
      metadata && this.options.metadata
        ? new BrowserHeaders({
          ...this.options?.metadata.headersMap,
          ...metadata?.headersMap,
        })
        : metadata || this.options.metadata;
    return new Promise((resolve, reject) => {
      grpc.unary(methodDesc, {
        request,
        host: this.host,
        metadata: maybeCombinedMetadata,
        transport: this.options.transport,
        debug: this.options.debug,
        onEnd: function (response) {
          if (response.status === grpc.Code.OK) {
            resolve(response.message);
          } else {
            const err = new Error(response.statusMessage) as any;
            err.code = response.status;
            err.metadata = response.trailers;
            reject(err);
          }
        },
      });
    });
  }
}

declare var self: any | undefined;
declare var window: any | undefined;
var globalThis: any = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  throw "Unable to locate global object";
})();

const atob: (b64: string) => string =
  globalThis.atob ||
  ((b64) => globalThis.Buffer.from(b64, "base64").toString("binary"));
function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

const btoa: (bin: string) => string =
  globalThis.btoa ||
  ((bin) => globalThis.Buffer.from(bin, "binary").toString("base64"));
function base64FromBytes(arr: Uint8Array): string {
  const bin: string[] = [];
  for (let i = 0; i < arr.byteLength; ++i) {
    bin.push(String.fromCharCode(arr[i]));
  }
  return btoa(bin.join(""));
}

type Builtin =
  | Date
  | Function
  | Uint8Array
  | string
  | number
  | boolean
  | undefined;
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function toTimestamp(date: Date): Timestamp {
  const seconds = date.getTime() / 1_000;
  const nanos = (date.getTime() % 1_000) * 1_000_000;
  return { seconds, nanos };
}

function fromTimestamp(t: Timestamp): Date {
  let millis = t.seconds * 1_000;
  millis += t.nanos / 1_000_000;
  return new Date(millis);
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof Date) {
    return o;
  } else if (typeof o === "string") {
    return new Date(o);
  } else {
    return fromTimestamp(Timestamp.fromJSON(o));
  }
}

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
  util.Long = Long as any;
  configure();
}