/* This is a demo extension */

#include <sqlite3ext.h>
#include <stdint.h>
SQLITE_EXTENSION_INIT1

typedef struct CountCtx CountCtx;

struct CountCtx
{
    int64_t n;
};

static void countStep(sqlite3_context *context, int argc, sqlite3_value **argv)
{
    CountCtx *p;
    p = sqlite3_aggregate_context(context, sizeof(*p));
    if ((argc == 0 || SQLITE_NULL != sqlite3_value_type(argv[0])) && p)
    {
        p->n++;
    }
}

static void countFinalize(sqlite3_context *context)
{
    CountCtx *p;
    p = sqlite3_aggregate_context(context, 0);
    sqlite3_result_int64(context, p ? p->n : 0);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
    int sqlite3_mycount_init(
        sqlite3 *db,
        char **pzErrMsg,
        const sqlite3_api_routines *pApi)
{
    int rc = SQLITE_OK;

    SQLITE_EXTENSION_INIT2(pApi);

    (void)pzErrMsg; /* Unused parameter */

    rc = sqlite3_create_function(db, "mycount", 0, SQLITE_UTF8 | SQLITE_INNOCUOUS | SQLITE_DETERMINISTIC, 0, 0, countStep, countFinalize);

    return rc;
}
