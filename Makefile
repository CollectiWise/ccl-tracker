
.PHONY: all

all: analytics.min.js

analytics.min.js: src/analytics.js
	yuicompressor --type js -o analytics.min.js src/analytics.js
