//go:build tools
// +build tools

package mintter

import (
	_ "github.com/99designs/gqlgen"
	_ "github.com/planetscale/vtprotobuf/cmd/protoc-gen-go-vtproto"
)
