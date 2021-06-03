//@ts-nocheck
import { GrpcWebImpl } from "@mintter/api/accounts/v1alpha/accounts";

export const rpc = new GrpcWebImpl('http://localhost:55001', {})
