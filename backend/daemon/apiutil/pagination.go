// Package apiutil provides various utility functions for writing our API handlers.
package apiutil

import (
	"encoding/base64"
	"encoding/json"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Key is an interface for an encryption key.
type Key interface {
	Encrypt([]byte) ([]byte, error)
	Decrypt([]byte) ([]byte, error)
}

// EncodePageToken creates a page token from the provided value.
// If the key is not nil, the token will be encrypted, for ensuring its opacity to the client.
// Encrypted tokens must be decrypted with the same key when decoding them.
func EncodePageToken(value any, key Key) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("failed to marshal page token value: %w", err)
	}

	if key != nil {
		data, err = key.Encrypt(data)
		if err != nil {
			return "", fmt.Errorf("failed to encrypt page token: %w", err)
		}
	}

	return base64.RawURLEncoding.EncodeToString(data), nil
}

// DecodePageToken decodes the provided page token into the value.
func DecodePageToken(token string, value any, key Key) error {
	data, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return fmt.Errorf("failed to decode page token: %w", err)
	}

	if key != nil {
		data, err = key.Decrypt(data)
		if err != nil {
			return fmt.Errorf("failed to decrypt page token: %w", err)
		}
	}

	if err := json.Unmarshal(data, value); err != nil {
		return fmt.Errorf("failed to unmarshal page token value: %w", err)
	}

	return nil
}

// ValidatePageSize validates the provided page size.
// The argument is a pointer because it sets the default value if the provided one is zero.
func ValidatePageSize(pageSize *int32) error {
	const defaultSize = 30

	if *pageSize < 0 {
		return status.Errorf(codes.InvalidArgument, "bad page size %d: must be a positive number", pageSize)
	}

	if *pageSize == 0 {
		*pageSize = defaultSize
	}

	return nil
}
