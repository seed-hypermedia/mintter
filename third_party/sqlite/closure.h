#ifndef CLOSURE_H
#define CLOSURE_H
#include "sqlite3ext.h"

int sqlite3_closure_init(
    sqlite3 *db,
    char **pzErrMsg,
    const sqlite3_api_routines *pApi);

#endif // CLOSURE_H
