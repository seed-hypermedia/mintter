package mttnet

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/ipfs/boxo/blockservice"
	blockstore "github.com/ipfs/boxo/blockstore"
	chunker "github.com/ipfs/boxo/chunker"
	"github.com/ipfs/boxo/exchange"
	"github.com/ipfs/boxo/files"
	"github.com/ipfs/boxo/ipld/merkledag"
	unixfile "github.com/ipfs/boxo/ipld/unixfs/file"
	"github.com/ipfs/boxo/ipld/unixfs/importer/balanced"
	"github.com/ipfs/boxo/ipld/unixfs/importer/helpers"
	"github.com/ipfs/boxo/provider"
	"github.com/ipfs/go-cid"
	ipld "github.com/ipfs/go-ipld-format"
	multihash "github.com/multiformats/go-multihash"
	"go.uber.org/zap"
)

const (
	// MaxFileBytes is the maximum file size in bytes to be uploaded.
	MaxFileBytes = 150 * 1024 * 1024 // 150 MiB.
	// SearchTimeout is the maximum time we are searching for a file.
	SearchTimeout = 30 * time.Second
)

// AddParams contains all of the configurable parameters needed to specify the
// importing process of a file.
type AddParams struct {
	Layout    string
	Chunker   string
	RawLeaves bool
	Hidden    bool
	Shard     bool
	NoCopy    bool
	HashFun   string
}

// HTTPHandler is an interface to pass to the router only the http handlers and
// not all the FileManager type.
type HTTPHandler interface {
	GetFile(http.ResponseWriter, *http.Request)
	UploadFile(http.ResponseWriter, *http.Request)
}

// FileManager is the main object to handle ipfs files.
type FileManager struct {
	log        *zap.Logger
	DAGService ipld.DAGService
	provider   provider.Provider
}

// NewFileManager creates a new fileManager instance.
func NewFileManager(log *zap.Logger, bs blockstore.Blockstore, bitswap exchange.Interface, prov provider.Provider) *FileManager {
	bsvc := blockservice.New(bs, bitswap)
	// Don't close the blockservice, because it doesn't do anything useful.
	// It's actually closing the exchange, which is not even its responsibility.
	// The whole blockservice interface is just bad, and IPFS keeps talking about removing it,
	// but I guess it's too engrained everywhere to remove easily.

	dag := merkledag.NewDAGService(bsvc)

	return &FileManager{
		log:        log,
		provider:   prov,
		DAGService: dag,
	}
}

// GetFile retrieves a file from ipfs.
func (fm *FileManager) GetFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")

	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, "Only GET method is supported.")
		return
	}
	vars := mux.Vars(r)
	cidStr, ok := vars["cid"]
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "Url format not recognized")
		return
	}
	cid, err := cid.Decode(cidStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "Wrong provided cid[%s]: %s", cidStr, err.Error())
		return
	}

	ctx := r.Context()

	n, err := fm.DAGService.Get(ctx, cid)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			w.WriteHeader(http.StatusRequestTimeout)
			fm.log.Debug("Timeout. Could not get the file", zap.String("CID", cid.String()), zap.Error(err))
			fmt.Fprintf(w, "Timeout. Could not get file with provided CID[%s].", cid.String())
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Debug("Could not get file", zap.String("CID", cid.String()), zap.Error(err))
			fmt.Fprintf(w, "Could not get file with provided CID[%s]: %s", cid.String(), err.Error())
		}

		return
	}

	unixFSNode, err := unixfile.NewUnixfsFile(ctx, fm.DAGService, n)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fm.log.Debug("Found the node but could not download it", zap.String("CID", cidStr), zap.Error(err))
		fmt.Fprintf(w, "Found the node but could not download it: %s", err.Error())
		return
	}

	var buf bytes.Buffer
	if f, ok := unixFSNode.(files.File); ok {
		if _, err := io.Copy(&buf, f); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Debug("Found the node but could not reconstruct the file", zap.String("CID", cidStr), zap.Error(err))
			fmt.Fprintf(w, "Found the Node but could not reconstruct the file: %s", err.Error())
			return
		}
	}
	w.WriteHeader(http.StatusOK)
	w.Header().Add("Content-Type", "application/octet-stream")
	w.Header().Add("ETag", cidStr)
	w.Header().Add("Cache-Control", "public, max-age=29030400, immutable")
	_, _ = w.Write(buf.Bytes())
}

// UploadFile uploads a file to ipfs.
func (fm *FileManager) UploadFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, POST, OPTIONS")

	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, "Only POST method is supported.")
		return
	}

	if r.ContentLength > MaxFileBytes {
		http.Error(w, "File too large", http.StatusRequestEntityTooLarge)
		return
	}

	if err := r.ParseMultipartForm(MaxFileBytes); err != nil {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		fmt.Fprintf(w, "Parse body error: %s", err.Error())
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "Error Retrieving file to upload: %v", err.Error())
		return
	}
	defer f.Close()

	n, err := fm.addFile(f)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, "Failed to add file to the IPFS blockstore: %v", err.Error())
		return
	}

	// Providing is best-effort so we don't fail the request if it fails.
	if err = fm.provider.Provide(n.Cid()); err != nil {
		fm.log.Warn("Failed to provide file", zap.Error(err))
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Add("Content-Type", "text/plain")
	w.Write([]byte(n.Cid().String()))
}

// addFile chunks and adds content to the DAGService from a reader. The content
// is stored as a UnixFS DAG (default for IPFS). It returns the root ipld.Node.
func (fm *FileManager) addFile(r io.Reader) (ipld.Node, error) {
	params := &AddParams{}

	prefix, err := merkledag.PrefixForCidVersion(1)
	if err != nil {
		return nil, fmt.Errorf("bad CID Version: %w", err)
	}

	hashFunCode, ok := multihash.Names[strings.ToLower("sha2-256")]
	if !ok {
		return nil, fmt.Errorf("unrecognized hash function: %s", "sha2-256")
	}
	prefix.MhType = hashFunCode
	prefix.MhLength = -1

	dbp := helpers.DagBuilderParams{
		Dagserv:    fm.DAGService,
		RawLeaves:  true, // Leave the actual file bytes untouched instead of wrapping them in a dag-pb protobuf wrapper
		Maxlinks:   helpers.DefaultLinksPerBlock,
		NoCopy:     false,
		CidBuilder: &prefix,
	}

	chnk, err := chunker.FromString(r, params.Chunker)
	if err != nil {
		return nil, err
	}
	dbh, err := dbp.New(chnk)
	if err != nil {
		return nil, err
	}

	var n ipld.Node
	n, err = balanced.Layout(dbh)
	return n, err
}
