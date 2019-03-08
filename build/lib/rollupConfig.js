"use strict";

var path = require("path"),

    file  = path.resolve("./gen/index.js"),
    input = path.resolve("./src/index.js");

module.exports = function(options) {
    var opts = options || {};

    return {
        input,
        context : "window",
        external : [ "firebase", "mithril" ],


        plugins : [
            // require("rollup-plugin-node-builtins")(),

            require("rollup-plugin-node-resolve")({
                browser        : true,
                ignoreGlobal   : true,
                preferBuiltins : false,
                main           : false // this is needed to prevent issues with c: vs z: on build server
            }),

            require("rollup-plugin-commonjs")(),

            require("@modular-css/rollup")({
                json : false,
                map  : !opts.compress,

                // Optional tiny exported selectors
                namer : opts.compress ?
                    require("@modular-css/shortnames")() :
                    undefined,

                // lifecycle hooks
                before : [
                    // require("stylelint")(),
                    require("postcss-nested")
                ],

                after : [
                    require("postcss-import")()
                ],

                // Optionally compress output
                done : opts.compress ?
                    [ require("cssnano")() ] :
                    [ ]
            }),

            require("rollup-plugin-string")({
                include : [ "**/*.svg" ]
            }),

            require("../external/rollup-plugin-file-as-blob")({
                include : "**/parse-schema.js"
            }),

            // opts.compress ?
            //     require("rollup-plugin-strip")() :
            //     {},

            // opts.compress ?
            //     require("rollup-plugin-babel")({
            //         exclude : "node_modules/**",
            //         plugins : [
            //             require("mithril-objectify")
            //         ]
            //     }) :
            //     {},

            // opts.compress ?
            //     require("rollup-plugin-terser")() :
            //     {},

            // require("rollup-plugin-filesize")()
        ]
    };
};

module.exports.entry = input;
module.exports.dest  = file;
