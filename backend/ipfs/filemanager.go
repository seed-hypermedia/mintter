package ipfs

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
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
	// IPFSRootRoute is the root route of ipfs.
	IPFSRootRoute = "/ipfs"
	// UploadRoute is the route to upload a file.
	UploadRoute = "/file-upload"
	routeVar    = "cid"
	// GetRoute is the route to get a file.
	GetRoute = "/{" + routeVar + "}"
	// MaxFileMB is the maximum file size (in MB) to be uploaded.
	MaxFileMB = 64
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

// GetFile retrieves a file from ipfs.
func (fm *FileManager) GetFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET")
	if !fm.started {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, "IPFS node not started")
		return
	}
	if r.Method != "GET" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, "Only GET method is supported.")
		return
	}
	vars := mux.Vars(r)
	cidStr, ok := vars[routeVar]
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
	ctx, cancel := context.WithTimeout(context.Background(), SearchTimeout)
	defer cancel()

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
	if !fm.started {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, "IPFS node not started")
		return
	}
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		fmt.Fprintf(w, "Only POST method is supported.")
		return
	}

	// Parse our multipart form, 10 << 20 specifies a maximum
	// upload of 10 MB files.
	if err := r.ParseMultipartForm(MaxFileMB << 20); err != nil {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		fmt.Fprintf(w, "Parse body error: %s", err.Error())
		return
	}
	if len(r.MultipartForm.File) != 1 {
		w.WriteHeader(http.StatusBadRequest)
		fm.log.Debug("Only one file supported", zap.Int("Number of files", len(r.MultipartForm.File)))
		fmt.Fprintf(w, "Only one file supported, got: %d", len(r.MultipartForm.File))
		return
	}
	fhs := []*multipart.FileHeader{}
	for _, v := range r.MultipartForm.File {
		fhs = v
	}
	if len(fhs) != 1 {
		w.WriteHeader(http.StatusBadRequest)
		fm.log.Debug("Only one file header file supported", zap.Int("Number of headers", len(fhs)))
		fmt.Fprintf(w, "Only one file header file supported, got: %d", len(fhs))
		return
	}
	file, err := fhs[0].Open()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fm.log.Warn("Error Retrieving file to upload", zap.Error(err))
		fmt.Fprintf(w, "Error Retrieving file to upload %s", err.Error())
		return
	}
	defer file.Close()
	n, err := fm.addFile(file)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fm.log.Warn("Cannot upload file to ipfs", zap.Error(err))
		fmt.Fprintf(w, "Cannot upload file to ipfs: %s", err.Error())
		return
	}
	size, err := n.Size()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fm.log.Warn("Cannot calculate size of the uploaded file", zap.Error(err))
		fmt.Fprintf(w, "Cannot calculate size of the uploaded file: %s", err.Error())
		return
	}

	if err = fm.provider.Provide(n.Cid()); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fm.log.Warn("Failed to provide file", zap.Error(err))
		fmt.Fprintf(w, "Failed to provide file: %s", err.Error())
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Header().Add("Content-Length", strconv.FormatInt(int64(size), 10))
	w.Header().Add("Content-Type", "text/plain")
	_, _ = w.Write([]byte(n.Cid().String()))
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
