#!/bin/bash

java -jar ~/closure-compiler/compiler.jar --js js/gears_init.js --js js/geo.js --js js/jquery-cookie-1.0.js --js js/countrybounds.js --js js/sha1.js --js_output_file js/base_compiled.js
