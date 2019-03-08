/* global Promise, fetch */
import m from "mithril";
import filter from "lodash.filter";
import each from "lodash.foreach";
import parallel from "run-parallel";

import join from "url-join";

import getId from "./lib/getId";
import label from "./lib/label";

import css from "./upload.css";

// Load fetch polyfill
import "whatwg-fetch";

import removeIcon from "../icons/remove.svg";

function status(response) {
    // Assume opaque responses are cool, because who knows?
    return response.type === "opaque" || (response.status >= 200 && response.status < 300);
}

// Helper
function checkStatus(response) {
    let error;

    if (status(response)) {
        return response;
    }

    error = new Error(response.statusText);
    error.response = response;

    throw error;
}

function name(remote) {
    const url = new URL(remote);

    return url.pathname.split("/").pop();
}

export default {
    oninit(vnode) {
        if (!vnode.attrs.field.ws) {
            console.error("No ws for upload field");
            // throw new Error("Must define a ws for upload fields");
        }

        vnode.state.id = getId(vnode.attrs);

        // Drag-n-drop state tracking
        vnode.state.dragging  = false;
        vnode.state.uploading = false;

        // attrs caching...?
        vnode.state.attrs = vnode.attrs;

        if (vnode.attrs.data) {
            if (typeof vnode.attrs.data === "string") {
                vnode.attrs.data = [ vnode.attrs.data ];
            }

            vnode.state.files = vnode.attrs.data
                .map(remote => ({
                    name     : name(remote),
                    uploaded : true,
                    remote   : remote
                }));
        } else {
            vnode.state.files = [];
        }
    },

    onbeforeupdate(vnode) {
        // dragging is false -> so yes redraw, or
        // dragging is 2 -> so no redraw (to account for dragon getting continuously called)
        if (vnode.state.dragging !== 1) {
            return !vnode.state.dragging;
        }

        // dragging is 1, so redraw, and increment dragging so no continuous redrawing due to dragon
        vnode.state.dragging++;

        return true;
    },

    remove(idx) {
        this.files.splice(idx, 1);

        this._update();
    },

    // this gets fired continuously when hovering over drop area
    // on first fire, dragging is false, so it gets set to 1
    // on subsequent fires it will be > 1 (from onbeforeupdate)
    dragon() {
        this.dragging = this.dragging || 1;
    },

    // reset to false;
    dragoff() {
        this.dragging = false;
    },

    drop(droppedFiles) {
        const { files, attrs } = this;

        let dropped;

        this.dragoff();

        // Must delete existing file before dragging on more
        if (files.length && !attrs.field.multiple) {
            return;
        }

        // Filter out non-images
        dropped = filter(droppedFiles, file =>
            file.type.indexOf("image/") === 0
        );

        if (attrs.field.multiple) {
            this.files = files.concat(dropped);
        } else {
            this.files = dropped.slice(-1);
        }

        // Load all the images in parallel so we can show previews
        parallel(
            this.files
                .filter(file => !file.uploaded)
                .map(file =>
                    callback => {
                        const reader = new FileReader();

                        reader.onload = result => {
                            file.src = result.target.result;

                            callback();
                        };

                        reader.readAsDataURL(file);
                    }
                ),

            err => {
                if (err) {
                    return console.error(err);
                }

                m.redraw();

                return this._upload();
            }
        );
    },

    // Update w/ the result, but removing anything that hasn't been uploaded
    _update() {
        const { attrs } = this;
        const files = this.files
            .filter(file => file.uploaded && file.remote)
            .map(file => file.remote);

        attrs.update(
            attrs.path,
            attrs.field.multiple ? files : files[0]
        );
    },

    // Upload any files that haven't been uploaded yet
    _upload() {
        const files = this.files.filter(file => !file.uploaded && !file.uploading);

        if (!files.length) {
            return;
        }

        fetch(this.attrs.field.ws)
        .then(checkStatus)
        .then(response => response.json())
        .then(config => {
            files.forEach(file => {
                file.uploading = true;
            });

            // queue a redraw here so we can show uploading status
            m.redraw();

            return Promise.all(
                files.map(file => {
                    const body = new FormData();

                    each(config.fields, (val, key) => {
                        body.append(key, val);
                    });

                    body.append("Content-Type", file.type);

                    each(this.attrs.field.headers || {}, (value, key) => {
                        body.append(key, value);
                    });

                    body.append(config.filefield, file);

                    return fetch(config.action, {
                        method : "post",
                        mode   : "cors",
                        body
                    })
                    .then(response => {
                        if (status(response)) {
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
        .then(() => this._update())
        .catch(error => {
            // TODO: error-handling
            console.error(error);
        });
    },

    view(vnode) {
        const { field } = vnode.attrs;
        const { dragging, id, files } = vnode.state;

        return m("div", { class : vnode.attrs.class },
            m(label, { id, field }),
            m("div", {
                    class : css[dragging ? "highlight" : "target"],

                    ondragover(e) {
                        e.preventDefault();
                        vnode.state.dragon();
                    },
                    ondragleave(e) {
                        e.preventDefault();
                        vnode.state.dragoff();
                    },
                    ondragend(e) {
                        e.preventDefault();
                        vnode.state.dragoff();
                    },
                    ondrop(e) {
                        e.preventDefault();
                        vnode.state.drop((e.dataTransfer || e.target).files);
                    }
                },
                files.length ?
                    m("ul", { class : css.queue },
                        files.map((file, idx) =>
                            m("li", { class : css.queued },
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
                                            value : file.remote,
                                            onclick(e) {
                                                e.target.select();
                                            }
                                        }) :
                                        null
                                ),
                                m("div", { class : css.actions },
                                    m("button", {
                                            class : css.remove,
                                            title : "Remove",

                                            onclick(e) {
                                                e.preventDefault();
                                                vnode.state.remove(idx, e);
                                            }
                                        },
                                        m.trust(removeIcon)
                                    )
                                )
                            )
                        )
                    ) :

                    m("p", { class : css.instructions }, field.multiple ?
                        "Drop files here to upload" :
                        "Drop a file here to upload"
                    )
            )
        );
    }
};
