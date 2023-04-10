package ipfs

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	blockstore "github.com/ipfs/go-ipfs-blockstore"
	"go.uber.org/zap"
)

const (
	// UploadRoute is the route to upload a file.
	UploadRoute = "/ipfs/file-upload"
)

// FileManager is the main object to handle ipfs files.
type FileManager struct {
	log        *zap.Logger
	blockstore blockstore.Blockstore
}

// NewManager creates a new fileManager instance.
func NewManager(log *zap.Logger, blockstore blockstore.Blockstore) *FileManager {
	return &FileManager{
		log:        log,
		blockstore: blockstore,
	}
}

// ServeHTTP Handles ipfs files.
func (fm *FileManager) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		http.ServeFile(w, r, "form.html")
	case "POST":
		encoder := json.NewEncoder(w)
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
		tempFile.Write(fileBytes)
		// return that we have successfully uploaded our file!
		fm.log.Debug("File successfully uploaded")
	default:
		fmt.Fprintf(w, "Only GET and POST methods are supported.")
	}
}
