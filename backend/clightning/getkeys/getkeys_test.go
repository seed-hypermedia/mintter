package getkeys

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"testing"

	"github.com/btcsuite/btcd/chaincfg"
)

func TestEncrypt(t *testing.T) {
	msg_plain := []byte{0x75, 0x4a, 0x2e, 0xee, 0xc3, 0x41, 0x79, 0x6a, 0x1d, 0x85, 0xa1, 0xce, 0xe5, 0xa4, 0x64, 0xcc,
		0xc7, 0x97, 0xcb, 0x16, 0x49, 0xec, 0xda, 0x7e, 0xb6, 0xe6, 0x40, 0xf2, 0xeb, 0x15, 0xd7, 0x44}

	encrypted, err := encrypt(msg_plain, "1234")

	if err != nil {
		t.Fatalf("no go: %s", err.Error())
	}
	plaintext, err := decrypt(encrypted, "1234")
	if err != nil {
		t.Fatalf("Error decrypting: %s", err.Error())
	}
	if !bytes.Equal(plaintext, msg_plain) {
		t.Fatal("decrypted message does not match")
	}

}

func TestCreateWithPriv(t *testing.T) {
	_, err := copy("./hsm/hsm_secret", "hsm_secret")
	if err != nil {
		t.Fatalf("couldn't emulate clightning copying the hsm_secret in the proper location: %s", err.Error())
	}
	defer os.Remove("hsm_secret")
	derpath := "m"
	gk := GetKeys{
		DerivationPath: derpath,
		HsmSecretPath:  "",
	}
	lightningdir, _ = os.Getwd()
	bitcoinNet = &chaincfg.TestNet3Params

	keys, err := gk.Call()
	if err != nil {
		t.Fatalf("no go: %s\n", err.Error())
	}
	if keys.(GetKeysResult).Xpub != "tpubD6NzVbkrYhZ4Xr3Cd4YJUgyFY3hvQ1LfAsYf9TFyEgfSEhKz1BJxRXBAuFdi7KLTn9htg64svmmMdorbFsf9q7iMB9vyZLV5VxrAkw6gnEF" {
		t.Fatal("xpub does not match with expected")
	}
	if keys.(GetKeysResult).Xpriv != "tprv8ZgxMBicQKsPeP1QjQsi5HK8y2BzEg9kbZwsrwDfpQs3QD5DNnVNF2ZJj4qobedcwYXYLq8ict6XGQrhsCPyJu4cdpqhgQpVbxw6V97U1tB" {
		t.Fatal("xpriv does not match with expected")
	}
	if keys.(GetKeysResult).Bech32 != "tb1qggzpw9u0wtzkeryfakr47stj6vsqawxehcyde7" {
		t.Fatal("bech32 does not match with expected")
	}
	if keys.(GetKeysResult).Wif != "cMiWahwRCiNrkLrNtC79JwV8ERZxdH8GjWD1VHwnUistoyHWbDDd" {
		t.Fatal("wif does not match with expected")
	}
	if keys.(GetKeysResult).DerPath != "" {
		t.Fatal("derivation path does not match with expected")
	}

}

func TestCreateWithDerivationEncrypted(t *testing.T) {
	derpath := "m/2'/2/45"
	gk := GetKeys{
		DerivationPath:  derpath,
		HsmSecretPath:   "./hsm/hsm_secret_encrypted",
		HsmPasswordFile: "./hsm/pass.txt",
	}
	lightningdir, _ = os.Getwd()
	bitcoinNet = &chaincfg.TestNet3Params

	keys, err := gk.Call()
	if err != nil {
		t.Fatalf("no go: %s\n", err.Error())
	}
	if keys.(GetKeysResult).Xpub != "tpubDDbvbG9aeK96bnL5ZPCq5uByEQEdSAecZjinaXvF8bRj4ze1oGxXrnQAmkppTSgTbEhjWTV6FCeppmJ3UB7RVm7sA6QLgn4r7amD57zDpQ5" {
		t.Fatal("xpub does not match with expected")
	}
	if keys.(GetKeysResult).Xpriv != "tprv8gutSr7LVwTRiKJHfjYEgVXrfNihGqThzS81J1swiKdLEWPFAt8wgHnJbci3YqLWFH5tq5GFkuhJpXNDqCnfbufpJzXbQo5ZBWQP9XBBBaY" {
		t.Fatal("xpriv does not match with expected")
	}
	if keys.(GetKeysResult).Bech32 != "tb1qv5lhldclf57heuzl2z23uev26x0jw5ngp2pm0t" {
		t.Fatal("bech32 does not match with expected")
	}
	if keys.(GetKeysResult).Wif != "cUTznBvedyD92xP5VKtZxCS1QrsTbUg9pMtejMdBs1t5yFwnppxY" {
		t.Fatal("wif does not match with expected")
	}
	if keys.(GetKeysResult).DerPath != "" {
		t.Fatal("derivation path does not match with expected")
	}
}

func TestCreateWithDerivation(t *testing.T) {
	derpath := "m/0/0/1"
	gk := GetKeys{
		DerivationPath: derpath,
		HsmSecretPath:  "./hsm/hsm_secret",
	}
	lightningdir, _ = os.Getwd()
	bitcoinNet = &chaincfg.TestNet3Params

	keys, err := gk.Call()
	if err != nil {
		t.Fatalf("no go: %s\n", err.Error())
	}
	if keys.(GetKeysResult).Xpub != "tpubDDBLzzso7Cp5ijCA4artLG2WQSoD3WiqwLbfm1VwbKmKSKifQ2wCXbpGsa8QCPkwQPdP9j1yZodu8q26yqXwasNNs6Z21NYGZ2f8JTUrWdg" {
		t.Fatal("xpub does not match with expected")
	}
	if keys.(GetKeysResult).Xpriv != "tprv8gVJraqYxq8QqGANAwCHvrNPqRHGtBXwN2ztUVTeB3xvbqTtme7cM7CQhPrae5Kt7PJPavoJcwDkhGeWStteLKoN55UrG8vkYowhujgjVdz" {
		t.Fatal("xpriv does not match with expected")
	}
	if keys.(GetKeysResult).Bech32 != "tb1q03vly58502c4npkxd7xdu5der2v5ua2u76y4re" {
		t.Fatal("bech32 does not match with expected")
	}
	if keys.(GetKeysResult).Wif != "cMf4cZ3AD4W9fzu5LacpJxfLy1GtQ1CVK46u4AyRP97mD9BpWPE6" {
		t.Fatal("wif does not match with expected")
	}
	if keys.(GetKeysResult).DerPath != "" {
		t.Fatal("derivation path does not match with expected")
	}
}

func copy(src, dst string) (int64, error) {
	sourceFileStat, err := os.Stat(src)
	if err != nil {
		return 0, err
	}

	if !sourceFileStat.Mode().IsRegular() {
		return 0, fmt.Errorf("%s is not a regular file", src)
	}

	source, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return 0, err
	}
	defer destination.Close()
	nBytes, err := io.Copy(destination, source)
	return nBytes, err
}
