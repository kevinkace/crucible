/* global Promise, fetch */
import m from "mithril";
import filter from "lodash.filter";
import each from "lodash.foreach";
import parallel from "run-parallel";

import join from "url-join";
    
import id from "./lib/id";
import label from "./lib/label";

import removeIcon from "../icons/remove.svg";

import css from "./upload.css";

// Load fetch polyfill
import "whatwg-fetch";

function status(response) {
    // Assume opaque responses are cool, because who knows?
    return response.type === "opaque" || (response.status >= 200 && response.status < 300);
}

// Helper
function checkStatus(response) {
    var error;
    
    if(status(response)) {
        return response;
    }
    
    error = new Error(response.statusText);
    error.response = response;
    
    throw error;
}

function name(remote) {
    var url = new URL(remote);

    return url.pathname.split("/").pop();
}

export default {
    oninit : function(vnode) {
        if(!vnode.attrs.field.ws) {
            console.error("No ws for upload field");
            // throw new Error("Must define a ws for upload fields");
        }
        
        vnode.state.id = id(vnode.attrs);
        
        // Drag-n-drop state tracking
        vnode.state.dragging  = false;
        vnode.state.uploading = false;
        
        // attrs caching
        vnode.state.attrs = vnode.attrs;
        
        if(vnode.attrs.data) {
            if(typeof vnode.attrs.data === "string") {
                vnode.attrs.data = [ vnode.attrs.data ];
            }
            
            vnode.state.files = vnode.attrs.data.map(function(remote) {
                return {
                    name     : name(remote),
                    uploaded : true,
                    remote   : remote
                };
            });
        } else {
            vnode.state.files = [];
        }
                
        // Event handlers
        vnode.state.remove = function(idx, e) {
            e.preventDefault();
            
            vnode.state.files.splice(idx, 1);
            
            vnode.state._update();
        };
        
        vnode.state.dragon = function(e) {
            e.preventDefault();

            if(vnode.state.dragging) {
                vnode.redraw = false;

                return;
            }
            
            // Don't show this as a drag target if there's already something there
            // and it's not a multiple field
            if(vnode.state.files.length && !vnode.state.attrs.field.multiple) {
                vnode.redraw = false;
                
                return;
            }
            
            vnode.state.dragging = true;
        };

        vnode.state.dragoff = function() {
            vnode.state.dragging = false;
        };

        vnode.state.drop = function(e) {
            var dropped;
            
            vnode.state.dragoff();
            e.preventDefault();
            
            // Must delete existing file before dragging on more
            if(vnode.state.files.length && !vnode.state.attrs.field.multiple) {
                return;
            }
            
            // Filter out non-images
            dropped = filter((e.dataTransfer || e.target).files, function(file) {
                return file.type.indexOf("image/") === 0;
            });
            
            if(vnode.state.attrs.field.multiple) {
                vnode.state.files = vnode.state.files.concat(dropped);
            } else {
                vnode.state.files = dropped.slice(-1);
            }
            
            // Load all the images in parallel so we can show previews
            parallel(
                vnode.state.files
                .filter(function(file) {
                    return !file.uploaded;
                })
                .map(function(file) {
                    return function(callback) {
                        var reader = new FileReader();

                        reader.onload = function(result) {
                            file.src = result.target.result;
                            
                            callback();
                        };

                        reader.readAsDataURL(file);
                    };
                }),
                
                function(err) {
                    if(err) {
                        return console.error(err);
                    }
                    
                    m.redraw();
                    
                    return vnode.state._upload();
                }
            );
        };
        
        // Update w/ the result, but removing anything that hasn't been uploaded
        vnode.state._update = function() {
            var files = vnode.state.files.filter(function(file) {
                    return file.uploaded && file.remote;
                }).map(function(file) {
                    return file.remote;
                });
            
            vnode.state.attrs.update(
                vnode.state.attrs.path,
                vnode.state.attrs.field.multiple ? files : files[0]
            );
        };
        
        // Upload any files that haven't been uploaded yet
        vnode.state._upload = function() {
            var files = vnode.state.files.filter(function(file) {
                    return !file.uploaded && !file.uploading;
                });
            
            if(!files.length) {
                return;
            }
            
            fetch(vnode.state.attrs.field.ws)
            .then(checkStatus)
            .then(function(response) {
                return response.json();
            })
            .then(function(config) {
                files.forEach(function(file) {
                    file.uploading = true;
                });
                
                // queue a redraw here so we can show uploading status
                m.redraw();
                
                return Promise.all(
                    files.map(function(file) {
                        var data = new FormData();
                        
                        each(config.fields, function(val, key) {
                            data.append(key, val);
                        });
                        
                        data.append("Content-Type", file.type);
                        
                        each(vnode.state.attrs.field.headers || {}, function(value, key) {
                            data.append(key, value);
                        });
                        
                        data.append(config.filefield, file);
                        
                        return fetch(config.action, {
                            method : "post",
                            body   : data,
                            mode   : "cors"
                        })
                        .then(function(response) {
                            if(status(response)) {
                                file.uploaded  = true;
                                file.uploading = false;
                                file.remote    = join(config.action, config.fields.key.replace("${filename}", file.name));
                            }
                            
                            // queue a redraw as each file completes/fails
                            m.redraw();
                            
                            return file;
                        });
                    })
                );
            })
            .then(vnode.state._update)
            .catch(function(error) {
                // TODO: error-handling
                console.error(error);
            });
        };
    },

    view : function(vnode) {
        var field  = vnode.attrs.field;
        
        vnode.state.attrs = vnode.attrs;

        return m("div", { class : vnode.attrs.class },
            label(vnode.state, vnode.attrs),
            m("div", {
                    // Attrs
                    class : css[vnode.state.dragging ? "highlight" : "target"],
                    
                    // Events
                    ondragover  : vnode.state.dragon,
                    ondragleave : vnode.state.dragoff,
                    ondragend   : vnode.state.dragoff,
                    ondrop      : vnode.state.drop
                },
                vnode.state.files.length ?
                    m("ul", { class : css.queue },
                        vnode.state.files.map(function(file, idx) {
                            return m("li", { class : css.queued },
                                m("div", { class : css.image },
                                    m("img", {
                                        class : css.img,
                                        src   : file.remote || file.src
                                    })
                                ),
                                m("div", { class : css.meta },
                                    m("p", { class : css.name }, file.name),
                                    file.uploading ?
                                        m("p", "UPLOADING") :
                                        null,
                                    file.uploaded ?
                                        m("input", {
                                            value   : file.remote,
                                            onclick : function(e) {
                                                e.target.select();
                                            }
                                        }) :
                                        null
                                ),
                                m("div", { class : css.actions },
                                    m("button", {
                                            // Attrs
                                            class : css.remove,
                                            title : "Remove",
                                            
                                            // Events
                                            onclick : vnode.state.remove.bind(vnode.state, idx)
                                        },
                                        m.trust(removeIcon)
                                    )
                                )
                            );
                        })
                    ) :
                        
                    m("p", { class : css.instructions }, field.multiple ?
                        "Drop files here to upload" :
                        "Drop a file here to upload"
                    )
            )
        );
    }
};
