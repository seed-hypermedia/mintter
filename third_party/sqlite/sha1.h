#ifndef SQLITE_SHA1_H
#define SQLITE_SHA1_H

#include <sqlite3.h>

int sqlite3_sha_init(
    sqlite3 *db,
    char **pzErrMsg,
    const sqlite3_api_routines *pApi);

#endif // SQLITE_SHA1_H