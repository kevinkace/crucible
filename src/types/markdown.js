import m from "mithril";
import Remarkable from "remarkable";
import editor from "codemirror";

import getId from "./lib/getId";
import label from "./lib/label";

import css from "./markdown.css";

const md = new Remarkable();

import "codemirror/mode/markdown/markdown";

export default {
    oninit(vnode) {
        vnode.state.id       = getId(vnode.attrs);
        vnode.state.markdown = vnode.attrs.data || "";
        vnode.state.previewing = false;
        vnode.state.previewHTML = null;

        vnode.state.attrs = vnode.attrs;
    },

    togglePreview() {
        this.previewHTML = md.render(this.markdown);
        this.previewing = !this.previewing;
    },

    editorChanged() {
        this.markdown = this.editor.doc.getValue();

        this.attrs.update(this.attrs.path, this.markdown);
    },

    editorSetup(dom) {
        this.editor = editor.fromTextArea(dom, {
            mode : "text/x-markdown",

            indentUnit   : 4,
            lineWrapping : true
        });

        this.editor.on("changes", this.editorChanged);
    },

    view(vnode) {
        const { id, previewing, markdown, previewHTML } = vnode.state;
        const { style, field } = vnode.attrs;

        return m("div", { class : style },
            m(label, { id, field }),
            m("div", { class : previewing ? css.inputHidden : css.input },
                m("textarea", {
                        oncreate({ dom }) {
                            vnode.state.editorSetup(dom);
                        }
                    },
                    markdown
                )
            ),
            m("div", { class : previewing ? css.input : css.inputHidden },
                m.trust(previewHTML)
            ),
            m("button", {
                    class : css.button,
                    onclick(e) {
                        e.preventDefault();
                        vnode.state.togglePreview();
                    }
                },
                previewing ? "Edit" : "Preview"
            )
        );
    }
};
