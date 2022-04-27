package getkeys

import (
	"crypto/rand"
	"fmt"
	"os"

	"golang.org/x/crypto/argon2"
	chacha "golang.org/x/crypto/chacha20poly1305"
)

const (
	SALT                            = "c-lightning"
	MAX_ENCRYPTED_HSM_SECRET_LENGTH = 512
)

func encrypt(msg []byte, password string) ([]byte, error) {
	key, err := getKey(password)
	if err != nil {
		return nil, err
	}
	aead, err := chacha.NewX(key)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aead.NonceSize(), aead.NonceSize()+len(msg)+aead.Overhead())
	if _, err := rand.Read(nonce); err != nil {
		panic(err)
	}
	// Encrypt the message and append the ciphertext to the nonce.
	encrypted := aead.Seal(nonce, nonce, msg, nil)

	return encrypted, nil
}

func decrypt_hsm(passfile, hsmfile string) ([]byte, error) {
	hsm_secret := make([]byte, MAX_ENCRYPTED_HSM_SECRET_LENGTH)
	password := ""
	if passfile != "" {
		content, err := os.ReadFile(passfile)
		if err != nil {
			return nil, fmt.Errorf("couldn't read hsm %v", err)
		}
		password = string(content)
	}

	f, err := os.Open(hsmfile)
	if err != nil {
		return nil, fmt.Errorf("couldn't open hsm_secret file %v", err)
	}
	defer f.Close()

	hsm_secret_len, err := f.Read(hsm_secret)
	if err != nil {
		return nil, fmt.Errorf("couldn't read hsm_secret %v", err)
	}
	if hsm_secret_len > MAX_ENCRYPTED_HSM_SECRET_LENGTH {
		return nil, fmt.Errorf("hsm_secret too big")
	}
	if password != "" && len(hsm_secret) > UNENCRYPTED_HSM_SECRET_LENGTH {
		hsm_secret, err = decrypt(hsm_secret[0:hsm_secret_len], password)
		if err != nil {
			return nil, err
		}
	}
	if password == "" && hsm_secret_len != UNENCRYPTED_HSM_SECRET_LENGTH {
		return nil, fmt.Errorf("expecting hsmsecret unencrypted with %d bytes, but %d bytes found, please provide a path to a valid password file if hsm_secret is encrypted", UNENCRYPTED_HSM_SECRET_LENGTH, len(hsm_secret))
	}
	return hsm_secret, nil
}

func decrypt(cipher []byte, password string) ([]byte, error) {
	key, err := getKey(password)
	if err != nil {
		return nil, err
	}
	aead, err := chacha.NewX(key)
	if err != nil {
		return nil, err
	}
	if len(cipher) < aead.NonceSize() {
		return nil, fmt.Errorf("hsm_cipher too short")
	}

	// Split nonce and ciphertext.
	nonce, ciphertext := cipher[:aead.NonceSize()], cipher[aead.NonceSize():]
	// Decrypt the message and check it wasn't tampered with.
	hsm_secret, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}
	return hsm_secret, nil
}

func getKey(password string) ([]byte, error) {
	salt := make([]byte, 16)
	for i, b := range []byte(SALT) {
		salt[i] = b
	}
	// MODERATE 256MB and 3 times
	return argon2.IDKey([]byte(password), salt, 3, 256*1024, 1, chacha.KeySize), nil
}
