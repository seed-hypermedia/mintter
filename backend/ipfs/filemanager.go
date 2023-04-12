package ipfs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	blockservice "github.com/ipfs/go-blockservice"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	chunker "github.com/ipfs/go-ipfs-chunker"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
	provider "github.com/ipfs/go-ipfs-provider"
	ipld "github.com/ipfs/go-ipld-format"
	"github.com/ipfs/go-merkledag"
	"github.com/ipfs/go-unixfs/importer/balanced"
	"github.com/ipfs/go-unixfs/importer/helpers"
	multihash "github.com/multiformats/go-multihash"
	"go.uber.org/zap"
)

const (
	// UploadRoute is the route to upload a file.
	UploadRoute = "/ipfs/file-upload"
	// MaxFileMB is the maximum file size (in MB) to be uploaded.
	MaxFileMB = 64
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

// FileManager is the main object to handle ipfs files.
type FileManager struct {
	ctx        context.Context
	started    bool
	log        *zap.Logger
	exch       exchange.Interface
	bstore     blockstore.Blockstore
	bservice   blockservice.BlockService
	DAGService ipld.DAGService // become a DAG service
	provider   provider.System
}

// NewManager creates a new fileManager instance.
func NewManager(ctx context.Context, log *zap.Logger) *FileManager {
	return &FileManager{
		log:     log,
		ctx:     ctx,
		started: false,
	}
}

// Start starts new manager.
func (fm *FileManager) Start(blockstore blockstore.Blockstore, bitswap *Bitswap, provider provider.System) error {
	fm.bstore = blockstore
	fm.exch = bitswap
	fm.provider = provider
	if err := fm.setupBlockService(); err != nil {
		return err
	}

	if err := fm.setupDAGService(); err != nil {
		fm.bservice.Close()
		return err
	}

	go fm.autoclose()
	fm.started = true
	return nil
}

func (fm *FileManager) autoclose() {
	<-fm.ctx.Done()
	fm.bservice.Close()
	fm.started = false
}

func (fm *FileManager) setupBlockService() error {
	fm.bservice = blockservice.New(fm.bstore, fm.exch)
	return nil
}

func (fm *FileManager) setupDAGService() error {
	fm.DAGService = merkledag.NewDAGService(fm.bservice)
	return nil
}

// ServeHTTP Handles ipfs files.
func (fm *FileManager) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	encoder := json.NewEncoder(w)
	if !fm.started {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = encoder.Encode("IPFS node not started")
		return
	}
	switch r.Method {
	case "GET":
		http.ServeFile(w, r, "form.html")
	case "POST":
		// Parse our multipart form, 10 << 20 specifies a maximum
		// upload of 10 MB files.
		if err := r.ParseMultipartForm(MaxFileMB << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = encoder.Encode("Parse body error: " + err.Error())
			return
		}
		if len(r.MultipartForm.File) != 1 {
			w.WriteHeader(http.StatusBadRequest)
			fm.log.Debug("Only one file supported", zap.Int("Number of files", len(r.MultipartForm.File)))
			_ = encoder.Encode("Only one file supported, got: " + strconv.FormatInt(int64(len(r.MultipartForm.File)), 10))
			return
		}
		fhs := []*multipart.FileHeader{}
		for _, v := range r.MultipartForm.File {
			fhs = v
		}
		if len(fhs) != 1 {
			w.WriteHeader(http.StatusBadRequest)
			fm.log.Debug("Only one file header file supported", zap.Int("Number of headers", len(fhs)))
			_ = encoder.Encode("Only one file header file supported, got: " + strconv.FormatInt(int64(len(fhs)), 10))
			return
		}
		file, err := fhs[0].Open()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Warn("Error Retrieving file", zap.Error(err))
			_ = encoder.Encode("Error Retrieving file" + err.Error())
			return
		}
		defer file.Close()
		n, err := fm.AddFile(file)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Warn("Cannot upload file to ipfs", zap.Error(err))
			_ = encoder.Encode("Cannot upload file to ipfs: " + err.Error())
			return
		}
		size, err := n.Size()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Warn("Cannot calculate size of the uploaded file", zap.Error(err))
			_ = encoder.Encode("Cannot calculate size of the uploaded file: " + err.Error())
			return
		}

		if err = fm.provider.Provide(n.Cid()); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fm.log.Warn("Failed to provide file", zap.Error(err))
			_ = encoder.Encode("Failed to provide file: " + err.Error())
			return
		}
		w.WriteHeader(http.StatusCreated)
		w.Header().Add("Content-Length", strconv.FormatInt(int64(size), 10))
		w.Header().Add("Content-Type", "text/plain")
		_, _ = w.Write([]byte(n.Cid().String()))
		return
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = encoder.Encode("Only GET and POST methods are supported.")
	}
}

// AddFile chunks and adds content to the DAGService from a reader. The content
// is stored as a UnixFS DAG (default for IPFS). It returns the root ipld.Node.
func (fm *FileManager) AddFile(r io.Reader) (ipld.Node, error) {
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
	DAGService := merkledag.NewDAGService(fm.bservice)

	dbp := helpers.DagBuilderParams{
		Dagserv:    DAGService,
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
