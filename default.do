# Unless we found a .do rule where we asked, let's try an .od rule for our native platform.
# This is just a convenience so that one could `redo foo/bar` instead of `redo out/native/foo/bar`.
redo-ifchange configured
cd out/native
. ./default.do