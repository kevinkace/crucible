import m from "mithril";
import Remarkable from "remarkable";
import editor from "codemirror";

import id from "./lib/id";
import label from "./lib/label";

import css from "./markdown.css";

var md = new Remarkable();

import "codemirror/mode/markdown/markdown";

export default {
    oninit : function(vnode) {
        vnode.state.id       = id(vnode.attrs);
        vnode.state.markdown = vnode.attrs.data || "";
        vnode.state.previewing  = false;
        vnode.state.previewHTML = null;

        vnode.state.attrs = vnode.attrs;

        vnode.state.togglePreview = function(e) {
            e.preventDefault();

            vnode.state.previewHTML = md.render(vnode.state.markdown);
            vnode.state.previewing = !vnode.state.previewing;
        };

        vnode.state.editorChanged = function() {
            vnode.state.markdown = vnode.state.editor.doc.getValue();

            vnode.state.attrs.update(vnode.state.attrs.path, vnode.state.markdown);
        };

        vnode.state.editorSetup = function(el, init) {
            if(init) {
                return;
            }

            vnode.state.editor = editor.fromTextArea(el, {
                mode : "text/x-markdown",

                indentUnit   : 4,
                lineWrapping : true
            });

            vnode.state.editor.on("changes", vnode.state.editorChanged);
        };
    },

    view : function(vnode) {
        vnode.state.attrs = vnode.attrs;

        return m("div", { class : vnode.attrs.class },
            label(vnode.state, vnode.attrs),
            m("div", { class : vnode.state.previewing ? css.inputHidden : css.input },
                m("textarea", { config : vnode.state.editorSetup },
                    vnode.state.markdown
                )
            ),
            m("div", { class : vnode.state.previewing ? css.input : css.inputHidden },
                m.trust(vnode.state.previewHTML)
            ),
            m("button", {
                    onclick : vnode.state.togglePreview,
                    class   : css.button
                },
                vnode.state.previewing ? "Edit" : "Preview"
            )
        );
    }
};
