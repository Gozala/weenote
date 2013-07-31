BROWSERIFY = node ./node_modules/browserify/bin/cmd.js

all:
	$(BROWSERIFY) --debug \
                --exports require \
                --entry ./src/weenote.js > ./weenote.js
