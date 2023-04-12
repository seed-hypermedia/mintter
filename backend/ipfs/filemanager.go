package ipfs

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	blockservice "github.com/ipfs/go-blockservice"
	"github.com/ipfs/go-datastore"
	blockstore "github.com/ipfs/go-ipfs-blockstore"
	chunker "github.com/ipfs/go-ipfs-chunker"
	exchange "github.com/ipfs/go-ipfs-exchange-interface"
	provider "github.com/ipfs/go-ipfs-provider"
	"github.com/ipfs/go-ipfs-provider/queue"
	"github.com/ipfs/go-ipfs-provider/simple"
	ipld "github.com/ipfs/go-ipld-format"
	"github.com/ipfs/go-merkledag"
	"github.com/ipfs/go-unixfs/importer/balanced"
	"github.com/ipfs/go-unixfs/importer/helpers"
	host "github.com/libp2p/go-libp2p/core/host"
	routing "github.com/libp2p/go-libp2p/core/routing"
	multihash "github.com/multiformats/go-multihash"
	"go.uber.org/zap"
)

const (
	// UploadRoute is the route to upload a file.
	UploadRoute = "/ipfs/file-upload"
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
	dht        routing.Routing
	host       host.Host
	exch       exchange.Interface
	store      datastore.Batching
	bstore     blockstore.Blockstore
	bservice   blockservice.BlockService
	DAGService ipld.DAGService // become a DAG service
	reprovider provider.System
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
func (fm *FileManager) Start(blockstore blockstore.Blockstore, host host.Host, dht routing.Routing, store datastore.Batching, bitswap *Bitswap) error {
	fm.bstore = blockstore

	fm.host = host
	fm.dht = dht
	fm.store = store
	fm.exch = bitswap
	if err := fm.setupBlockService(); err != nil {
		return err
	}

	if err := fm.setupDAGService(); err != nil {
		fm.bservice.Close()
		return err
	}

	if err := fm.setupReprovider(0); err != nil {
		fm.bservice.Close()
		return err
	}

	go fm.autoclose()
	fm.started = true
	return nil
}

func (fm *FileManager) autoclose() {
	<-fm.ctx.Done()
	fm.reprovider.Close()
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

func (fm *FileManager) setupReprovider(reprovideInterval time.Duration) error {
	queue, err := queue.NewQueue(fm.ctx, "repro", fm.store)
	if err != nil {
		return err
	}

	prov := simple.NewProvider(fm.ctx, queue, fm.dht)

	reprov := simple.NewReprovider(
		fm.ctx,
		reprovideInterval,
		fm.dht,
		simple.NewBlockstoreProvider(fm.bstore),
	)

	fm.reprovider = provider.NewSystem(prov, reprov)
	fm.reprovider.Run()
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
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = encoder.Encode("Parse body error: " + err.Error())
			return
		}
		// FormFile returns the first file for the given key `myFile`
		// it also returns the FileHeader so we can get the Filename,
		// the Header and the size of the file
		file, handler, err := r.FormFile("myFile")
		if err != nil {
			fm.log.Debug("Error Retrieving the File: ", zap.Error(err))
			return
		}
		defer file.Close()

		fm.log.Debug("Uploading file", zap.String("Name", handler.Filename), zap.Int64("Size", handler.Size))
		// Create a temporary file within our temp-images directory that follows
		// a particular naming pattern
		tempFile, err := os.CreateTemp("temp-images", "upload-*.png")
		if err != nil {
			fmt.Println(err)
		}
		defer tempFile.Close()

		// read all of the contents of our uploaded file into a
		// byte array
		fileBytes, err := io.ReadAll(file)
		if err != nil {
			fmt.Println(err)
		}
		// write this byte array to our temporary file
		_, _ = tempFile.Write(fileBytes)
		// return that we have successfully uploaded our file!
		fm.log.Debug("File successfully uploaded")
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
