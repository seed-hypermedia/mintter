package lndhub

import "net/url"

type Credentials struct {
	ConnectionURL string
	Login         string
	Password      string
}

// ParseCredentials from a configuration URL.
func ParseCredentials(rawURL string) (Credentials, error) {
	url.Parse(rawURL)

	// Check url scheme is lnd hub. Extract the necessary info

	return Credentials{}, nil
}
