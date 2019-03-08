/* eslint no-console:false */
"use strict";

var rollup   = require("rollup").rollup,
    duration = require("humanize-duration"),
    // size     = require("filesize"),

    argv = require("minimist")(process.argv.slice(2)),

    files  = require("./lib/files"),
    config = require("./lib/rollupConfig")(argv),
    file   = require("./lib/rollupConfig").dest,

    start = Date.now();

files.copy();

console.log(file);

rollup(config)
    // .then(cfg => {
    //     console.log(cfg);

    //     return cfg;
    // })
    .then(bundle =>
        bundle.write({
            format : "iife",
            file,

            globals : {
                firebase : "Firebase",
                mithril  : "m"
            },

            sourcemap      : true,
            assetFileNames : "[name][extname]"
        })
    )
    .then(() => {
        console.log("Bundle written in %s", duration(Date.now() - start));
    })
    .catch(error => {
        console.error(error.toString());
        console.error(error.stack)
    });
