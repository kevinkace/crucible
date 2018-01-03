import m from "mithril";
import capitalize from "lodash.capitalize";

import watch from "../../lib/watch";
import db from "../../lib/firebase";
import prefix from "../../lib/prefix";

import Content from "../content-edit/content-state";

import * as editor from "./editor";
import * as children from "../../types/children";
import * as layout from "../layout/index";

import parse from "./parse-schema.js";

import css from "./schema-edit.css";
import flexCss from "../../flex.css";

export function oninit(vnode) {
    var id     = m.route.param("schema"),
        ref    = db.child("schemas/" + id),
        worker = new Worker(parse);

    vnode.state.ref     = ref;
    vnode.state.schema  = null;
    vnode.state.worker  = worker;
    vnode.state.data    = {};
    vnode.state.preview = {
        valid : true,
        value : ""
    };

    // Get Firebase data
    ref.on("value", function(snap) {
        vnode.state.schema = snap.val();

        if(!vnode.state.preview.value) {
            vnode.state.preview.value = vnode.state.schema.preview || "";
        }

        // Ensure that we run it through the worker asap
        if(vnode.state.schema.source) {
            worker.postMessage(vnode.state.schema.source);
        }

        m.redraw();
    });

    // Event Handlers
    vnode.state.previewChanged = function(e) {
        var el = e.target;

        vnode.state.preview.valid = el.validity.valid;
        vnode.state.preview.value = el.value;

        ref.child("preview").set(el.value);
    };

    vnode.state.slugChanged = function(value) {
        ref.child("slug").set(value);
    };

    // Listen for the worker to finish and update firebase
    worker.addEventListener("message", function(e) {
        var data = JSON.parse(e.data);

        if(data.error) {
            vnode.state.error = true;
        } else {
            ref.child("fields").set(data.config);
            vnode.state.error = false;
        }

        m.redraw();
    });

    watch(ref);
}

export function view(vnode) {
    var content = new Content(),
        state   = content.get();

    if(!vnode.state.schema) {
        return m(layout, { loading : true });
    }

    return m(layout, {
        title   : "Edit Schema: " + capitalize(vnode.state.schema.name),
        content : m("div", { class : layout.css.content },
            vnode.state.error ?
                m("p", { class : css.error }, vnode.state.error) :
                null,

            m("div", { class : layout.css.body },
                m("h1", { class : css.title }, "Edit Schema: " + capitalize(vnode.state.schema.name)),

                m("div", { class : css.contentWidth },

                    m("div", { class : css.definitions },
                        m("h2", "Field Definitions"),
                        m("div", { class : css.editor },
                            m(editor, {
                                ref    : vnode.state.ref,
                                worker : vnode.state.worker,
                                source : vnode.state.schema.source || "{\n\n}"
                            })
                        )
                    ),

                    m("div", { class : css.preview },
                        m("h2", "Preview"),
                        m("div", { class : css.fields },
                            m(children, {
                                fields : vnode.state.schema.fields,
                                class  : css.children,
                                data   : state.fields || {},
                                path   : [ "fields" ],
                                state  : state.fields,

                                update  : content.setField.bind(content),
                                content : content,

                                registerHidden : content.hidden.register.bind(content.hidden)
                            })
                        )
                    ),

                    m("div", { class : css.details },
                        m("h2", "Details"),
                        m("label", { class : css.genSlugs },
                            "Generate slugs for entries? ",
                            m("input", {
                                // Attrs
                                class   : css.slug,
                                type    : "checkbox",
                                checked : vnode.state.schema.slug,

                                // Events
                                onchange : m.withAttr("checked", vnode.state.slugChanged)
                            })
                        ),
                        m("div", { class : css.urlBase },
                            m("label", { for : "preview" }, "Preview URL base: "),
                            m("span", { class : css.url },
                                m("input", {
                                    // Attrs
                                    id    : "preview",
                                    class : css[vnode.state.preview.valid ? "urlInputPreview" : "urlInputError"],
                                    type  : "url",
                                    value : vnode.state.preview.value || "",

                                    // Events
                                    oninput : vnode.state.previewChanged,

                                    // Config Fn
                                    oncreate : function(inputVnode) {
                                        vnode.state.preview.valid = inputVnode.dom.validity.valid;
                                    }
                                }),
                                m("p", { class : css.previewUrl },
                                    vnode.state.preview.value ?
                                        vnode.state.preview.value + "-0IhUBgUFfhyLQ2m6s5x" :
                                        null
                                )
                            )
                        )
                    )
                )
            )
        )
    });
}
