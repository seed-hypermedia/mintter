package index

import (
	"errors"
	"fmt"
	"seed/backend/pkg/dqb"
	"seed/backend/pkg/maybe"
	"seed/backend/pkg/sqlitegen"

	"crawshaw.io/sqlite"
	"crawshaw.io/sqlite/sqlitex"
)

// dbStructuralBlobsInsert inserts a structural blob.
func dbStructuralBlobsInsert(conn *sqlite.Conn, id int64, blobType string, author, resource, ts maybe.Value[int64], meta maybe.Value[[]byte]) error {
	if id == 0 {
		return fmt.Errorf("must specify blob ID")
	}

	return sqlitex.Exec(conn, qStructuralBlobsInsert(), nil, id, blobType, author.Any(), resource.Any(), ts.Any(), meta.Any())
}

var qStructuralBlobsInsert = dqb.Str(`
	INSERT INTO structural_blobs (id, type, author, resource, ts, extra_attrs)
	VALUES (?, ?, ?, ?, ?, ?);
`)

func dbBlobLinksInsertOrIgnore(conn *sqlite.Conn, blobLinksSource int64, blobLinksType string, blobLinksTarget int64) error {
	before := func(stmt *sqlite.Stmt) {
		stmt.SetInt64(":blobLinksSource", blobLinksSource)
		stmt.SetText(":blobLinksType", blobLinksType)
		stmt.SetInt64(":blobLinksTarget", blobLinksTarget)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobLinksInsertOrIgnore(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobLinksInsertOrIgnore: %w", err)
	}

	return err
}

var qBlobLinksInsertOrIgnore = dqb.Str(`
	INSERT OR IGNORE INTO blob_links (source, type, target)
	VALUES (:blobLinksSource, :blobLinksType, :blobLinksTarget)
`)

func dbResourceLinksInsert(conn *sqlite.Conn, sourceBlob, targetResource int64, ltype string, isPinned bool, meta []byte) error {
	return sqlitex.Exec(conn, qResourceLinksInsert(), nil, sourceBlob, targetResource, ltype, isPinned, maybe.AnySlice(meta))
}

var qResourceLinksInsert = dqb.Str(`
	INSERT INTO resource_links (source, target, type, is_pinned, extra_attrs)
	VALUES (?, ?, ?, ?, ?);
`)

type blobsGetSizeResult struct {
	BlobsID   int64
	BlobsSize int64
}

func dbBlobsGetSize(conn *sqlite.Conn, blobsMultihash []byte) (blobsGetSizeResult, error) {
	var out blobsGetSizeResult

	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":blobsMultihash", blobsMultihash)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("BlobsGetSize: more than one result return for a single-kind query")
		}

		out.BlobsID = stmt.ColumnInt64(0)
		out.BlobsSize = stmt.ColumnInt64(1)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsGetSize(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsGetSize: %w", err)
	}

	return out, err
}

var qBlobsGetSize = dqb.Str(`
	SELECT blobs.id, blobs.size
	FROM blobs INDEXED BY blobs_metadata_by_hash
	WHERE blobs.multihash = :blobsMultihash
`)

func dbPublicKeysLookupID(conn *sqlite.Conn, publicKeysPrincipal []byte) (int64, error) {
	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":publicKeysPrincipal", publicKeysPrincipal)
	}

	var out int64

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("PublicKeysLookupID: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qPublicKeysLookupID(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: PublicKeysLookupID: %w", err)
	}

	return out, err
}

var qPublicKeysLookupID = dqb.Str(`
	SELECT public_keys.id
	FROM public_keys
	WHERE public_keys.principal = :publicKeysPrincipal
	LIMIT 1
`)

func dbPublicKeysInsert(conn *sqlite.Conn, principal []byte) (int64, error) {
	var out int64

	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":principal", principal)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("PublicKeysInsert: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qPublicKeysInsert(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: PublicKeysInsert: %w", err)
	}

	return out, err
}

var qPublicKeysInsert = dqb.Str(`
	INSERT INTO public_keys (principal)
	VALUES (:principal)
	RETURNING public_keys.id AS public_keys_id
`)

func dbBlobsInsert(conn *sqlite.Conn, blobsID int64, blobsMultihash []byte, blobsCodec int64, blobsData []byte, blobsSize int64) (int64, error) {
	var out int64

	before := func(stmt *sqlite.Stmt) {
		stmt.SetInt64(":blobsID", blobsID)
		stmt.SetBytes(":blobsMultihash", blobsMultihash)
		stmt.SetInt64(":blobsCodec", blobsCodec)
		stmt.SetBytes(":blobsData", blobsData)
		stmt.SetInt64(":blobsSize", blobsSize)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("BlobsInsert: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsInsert(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsInsert: %w", err)
	}

	return out, err
}

var qBlobsInsert = dqb.Str(`
	INSERT INTO blobs (id, multihash, codec, data, size)
	VALUES (NULLIF(:blobsID, 0), :blobsMultihash, :blobsCodec, :blobsData, :blobsSize)
	RETURNING blobs.id;
`)

type entitiesLookupIDResult struct {
	ResourcesID    int64
	ResourcesOwner int64
}

func dbEntitiesLookupID(conn *sqlite.Conn, entities_eid string) (entitiesLookupIDResult, error) {
	var out entitiesLookupIDResult

	before := func(stmt *sqlite.Stmt) {
		stmt.SetText(":entities_eid", entities_eid)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("EntitiesLookupID: more than one result return for a single-kind query")
		}

		out.ResourcesID = stmt.ColumnInt64(0)
		out.ResourcesOwner = stmt.ColumnInt64(1)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qEntitiesLookupID(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: EntitiesLookupID: %w", err)
	}

	return out, err
}

var qEntitiesLookupID = dqb.Str(`
	SELECT resources.id, resources.owner
	FROM resources
	WHERE resources.iri = :entities_eid
	LIMIT 1
`)

func dbEntitiesInsertOrIgnore(conn *sqlite.Conn, entity_id string) (int64, error) {
	var out int64

	before := func(stmt *sqlite.Stmt) {
		stmt.SetText(":entity_id", entity_id)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("EntitiesInsertOrIgnore: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qEntitiesInsertOrIgnore(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: EntitiesInsertOrIgnore: %w", err)
	}

	return out, err
}

var qEntitiesInsertOrIgnore = dqb.Str(`
	INSERT OR IGNORE INTO resources (iri)
	VALUES (:entity_id)
	RETURNING resources.id AS entities_id
`)

func dbResourcesMaybeSetOwner(conn *sqlite.Conn, id, owner int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource ID")
	}

	if owner == 0 {
		return false, fmt.Errorf("must specify owner ID")
	}

	if err := sqlitex.Exec(conn, qResourcesMaybeSetOwner(), nil, owner, id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesMaybeSetOwner = dqb.Str(`
	UPDATE resources
	SET owner = ?
	WHERE id = ?
	AND owner IS NULL;
`)

func dbResourcesMaybeSetTimestamp(conn *sqlite.Conn, id, ts int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource ID")
	}

	if ts == 0 {
		return false, fmt.Errorf("must specify timestamp")
	}

	if err := sqlitex.Exec(conn, qResourcesMaybeSetTimestamp(), nil, ts, id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesMaybeSetTimestamp = dqb.Str(`
	UPDATE resources
	SET create_time = ?
	WHERE id = ?
	AND create_time IS NULL;
`)

func dbResourcesMaybeSetGenesis(conn *sqlite.Conn, id, genesis int64) (updated bool, err error) {
	if id == 0 {
		return false, fmt.Errorf("must specify resource ID")
	}

	if genesis == 0 {
		return false, fmt.Errorf("must specify timestamp")
	}

	if err := sqlitex.Exec(conn, qResourcesMaybeSetGenesis(), nil, genesis, id); err != nil {
		return false, err
	}

	return conn.Changes() > 0, nil
}

var qResourcesMaybeSetGenesis = dqb.Str(`
	UPDATE resources
	SET genesis_blob = ?
	WHERE id = ?
	AND create_time IS NULL;
`)

func dbBlobsDelete(conn *sqlite.Conn, blobsMultihash []byte) (int64, error) {
	var out int64

	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":blobsMultihash", blobsMultihash)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("BlobsDelete: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsDelete(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsDelete: %w", err)
	}

	return out, err
}

var qBlobsDelete = dqb.Str(`
	DELETE FROM blobs
	WHERE blobs.multihash = :blobsMultihash
	RETURNING blobs.id
`)

type blobsListKnownResult struct {
	BlobsID        int64
	BlobsMultihash []byte
	BlobsCodec     int64
}

func dbBlobsListKnown(conn *sqlite.Conn) ([]blobsListKnownResult, error) {
	var out []blobsListKnownResult

	before := func(stmt *sqlite.Stmt) {
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		out = append(out, blobsListKnownResult{
			BlobsID:        stmt.ColumnInt64(0),
			BlobsMultihash: stmt.ColumnBytes(1),
			BlobsCodec:     stmt.ColumnInt64(2),
		})

		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsListKnown(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsListKnown: %w", err)
	}

	return out, err
}

var qBlobsListKnown = dqb.Str(`
	SELECT blobs.id, blobs.multihash, blobs.codec
	FROM blobs INDEXED BY blobs_metadata
	-- LEFT JOIN drafts ON drafts.blob = blobs.id
	WHERE blobs.size >= 0
	-- AND drafts.blob IS NULL
	ORDER BY blobs.id
`)

func dbBlobsHave(conn *sqlite.Conn, blobsMultihash []byte) (int64, error) {
	var out int64

	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":blobsMultihash", blobsMultihash)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("BlobsHave: more than one result return for a single-kind query")
		}

		out = stmt.ColumnInt64(0)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsHave(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsHave: %w", err)
	}

	return out, err
}

var qBlobsHave = dqb.Str(`
	SELECT 1 AS have
	FROM blobs INDEXED BY blobs_metadata_by_hash
	WHERE blobs.multihash = :blobsMultihash
	AND blobs.size >= 0
`)

type blobsGetResult struct {
	BlobsID        int64
	BlobsMultihash []byte
	BlobsCodec     int64
	BlobsData      []byte
	BlobsSize      int64
}

func dbBlobsGet(conn *sqlite.Conn, blobsMultihash []byte) (blobsGetResult, error) {
	var out blobsGetResult

	before := func(stmt *sqlite.Stmt) {
		stmt.SetBytes(":blobsMultihash", blobsMultihash)
	}

	onStep := func(i int, stmt *sqlite.Stmt) error {
		if i > 1 {
			return errors.New("BlobsGet: more than one result return for a single-kind query")
		}

		out.BlobsID = stmt.ColumnInt64(0)
		out.BlobsMultihash = stmt.ColumnBytes(1)
		out.BlobsCodec = stmt.ColumnInt64(2)
		out.BlobsData = stmt.ColumnBytes(3)
		out.BlobsSize = stmt.ColumnInt64(4)
		return nil
	}

	err := sqlitegen.ExecStmt(conn, qBlobsGet(), before, onStep)
	if err != nil {
		err = fmt.Errorf("failed query: BlobsGet: %w", err)
	}

	return out, err
}

var qBlobsGet = dqb.Str(`
	SELECT blobs.id, blobs.multihash, blobs.codec, blobs.data, blobs.size
	FROM blobs
	WHERE blobs.multihash = :blobsMultihash AND blobs.size >= 0
`)
