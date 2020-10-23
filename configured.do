[ -d out/darwin_amd64 ] || (mkdir -p out/darwin_amd64 && cd out/darwin_amd64 && ../../configure GOOS=darwin GOARCH=amd64)
[ -d out/linux_amd64 ] || (mkdir -p out/linux_amd64 && cd out/linux_amd64 && ../../configure GOOS=linux GOARCH=amd64)
[ -d out/windows_amd64 ] || (mkdir -p out/windows_amd64 && cd out/windows_amd64 && ../../configure GOOS=windows GOARCH=amd64)


HOST_PLATFORM="$(go env GOHOSTOS)_$(go env GOHOSTARCH)"
[ -e out/native ] || ln -s ./$HOST_PLATFORM out/native

redo-ifchange out/darwin_amd64/default.do out/native/default.do out/linux_amd64/default.do out/windows_amd64/default.do