import m from "mithril";
import capitalize from "lodash.capitalize";

import watch from "../../lib/watch";
import db from "../../lib/firebase";

import Content from "../content-edit/Content";

import editor from "./editor";
import children from "../../types/children";
import layout, { layoutCss } from "../layout";

import css from "./schema-edit.css";

import parseSchema from "./parse-schema.js";

export default {
    oninit(vnode) {
        const schemaName = m.route.param("schema");
        const schemaRef  = db.child(`schemas/${schemaName}`);
        const worker     = new Worker(parseSchema);

        vnode.state.schemaRef = schemaRef;
        vnode.state.schema    = null;
        vnode.state.worker    = worker;
        vnode.state.data      = {};
        vnode.state.preview   = {
            valid : true,
            value : ""
        };

        // Get Firebase data
        schemaRef.on("value", snap => {
            vnode.state.schema = snap.val();

            if (!vnode.state.preview.value) {
                vnode.state.preview.value = vnode.state.schema.preview || "";
            }

            // Ensure that we run it through the worker asap
            if (vnode.state.schema.source) {
                worker.postMessage(vnode.state.schema.source);
            }

            m.redraw();
        });

        // Listen for the worker to finish and update firebase
        worker.addEventListener("message", e => {
            const data = JSON.parse(e.data);

            if (data.error) {
                vnode.state.error = true;
            } else {
                schemaRef.child("fields").set(data.config);
                vnode.state.error = false;
            }

            m.redraw();
        });

        watch(schemaRef);
    },

    previewChanged(e) {
        const el = e.target;

        this.preview.valid = el.validity.valid;
        this.preview.value = el.value;

        this.schemaRef.child("preview").set(el.value);
    },

    slugChanged(value) {
        this.schemaRef.child("slug").set(value);
    },

    view(vnode) {
        const content = new Content();
        const state   = content.get();
        const {
            schema, schemaRef,
            worker, error,
            preview
        } = vnode.state;

        return !schema ?
            m(layout, { loading : true }) :

            m(layout, { title : `Edit Schema: ${capitalize(schema.name)}` },
                m("div", { class : layoutCss.content },
                    error ?
                        m("p", { key : Date.now(), class : css.error }, error) :
                        null,

                    m("div", { class : layoutCss.body },
                        m("h1", { class : css.title }, `Edit Schema: ${capitalize(schema.name)}`),

                        m("div", { class : css.contentWidth },

                            m("div", { class : css.definitions },
                                m("h2", "Field Definitions"),
                                m("div", { class : css.editor },
                                    m(editor, {
                                        ref    : schemaRef,
                                        source : schema.source || "{\n\n}",
                                        worker
                                    })
                                )
                            ),

                            m("div", { class : css.preview },
                                m("h2", "Preview"),
                                m("div", { class : css.fields },
                                    m(children, {
                                        fields : schema.fields,
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
                                        class   : css.slug,
                                        type    : "checkbox",
                                        checked : schema.slug,

                                        onchange : m.withAttr("checked", value => {
                                            vnode.state.slugChanged(value);
                                        })
                                    })
                                ),
                                m("div", { class : css.urlBase },
                                    m("label", { for : "preview" }, "Preview URL base: "),
                                    m("span", { class : css.url },
                                        m("input", {
                                            id    : "preview",
                                            class : css[preview.valid ? "urlInputPreview" : "urlInputError"],
                                            type  : "url",
                                            value : preview.value || "",

                                            oninput(e) {
                                                vnode.state.previewChanged(e);
                                            },

                                            // Config Fn
                                            // todo: does this work!??
                                            onbeforeupdate({ dom }) {
                                                if (!vnode.state.prevInit) {
                                                    return;
                                                }

                                                vnode.state.prevInit = true;

                                                preview.valid = dom.validity.valid;
                                            }
                                        }),
                                        m("p", { class : css.previewUrl },
                                            preview.value ?
                                                `${preview.value}-0IhUBgUFfhyLQ2m6s5x` :
                                                null
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
    }
};
