VERSION := $(shell bun -e "console.log(require('./package.json').version)")
COMMON_FLAGS := --compile --minify --sourcemap --bytecode
DEFINES := --define __APP_VERSION__='"$(VERSION)"' --define __APP_ENV__='"production"'

.PHONY: build build-linux-x64 build-darwin-x64 build-darwin-arm64 build-windows-x64

build: build-linux-x64 build-darwin-x64 build-darwin-arm64 build-windows-x64

build-linux-x64:
	bun build src/index.ts $(COMMON_FLAGS) --target=bun-linux-x64 --outfile dist/addon-manager-linux-x64 $(DEFINES)

build-darwin-x64:
	bun build src/index.ts $(COMMON_FLAGS) --target=bun-darwin-x64 --outfile dist/addon-manager-darwin-x64 $(DEFINES)

build-darwin-arm64:
	bun build src/index.ts $(COMMON_FLAGS) --target=bun-darwin-arm64 --outfile dist/addon-manager-darwin-arm64 $(DEFINES)

build-windows-x64:
	bun build src/index.ts $(COMMON_FLAGS) --target=bun-windows-x64 --outfile dist/addon-manager-windows-x64.exe $(DEFINES)
