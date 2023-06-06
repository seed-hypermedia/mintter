# HyperDocs Identity

HyperDocs includes an identity system, built on [Terra Data](./terra-data).

## Account IDs

An Account ID is a cryptographic "key-pair", where the account holder keeps the private key safe. The Account Key is considered top-secret, and the corresponding "public key" is the Account ID.

## Key Derivation

Follow the epilipsy curve!?

## Mnemonics

The private key is ? bits of data.

BIP-39 is used to display that data in a human readable format- 12 memorable words. Users are encouraged to write these words down in a safe place so they can retain their identity and reset their device IDs.


## Key Delegation

Because the Account Key should not be saved

## Device IDs

A Device ID is saved on the user's computer and is used to sign content on behalf of the Account ID.

Device keys are created using the same key derivation process. Right?

## KeyDelegation Blob

```
{
    "type": "HyperDocs:KeyDelegation",
    TODO
}
```

## WIP

> Note: This section is a Work-in-Progress. The HyperDocs Identity will eventually support KeyDelegation expiration times, and the ability to revoke device delegation by issuing another Blob