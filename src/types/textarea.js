import m from "mithril";
import assign from "lodash.assign";

import getId from "./lib/getId";
import label from "./lib/label";

import css from "./textarea.css";

export default {
    oninit(vnode) {
        vnode.state.id   = getId(vnode.attrs);
        vnode.state.text = vnode.attrs.data || "";
    },

    resize(opt, value) {
        opt.update(opt.path, value);

        this.text = value;
    },

    view(vnode) {
        const { id, text } = vnode.state;
        const { field, class : style, required, data } = vnode.attrs;

        return m("div", { class : style },
            m(label, { id, field }),
            m("div", { class : css.expander },
                m("pre", { class : css.shadow }, m("span", text), m("br")),
                m("textarea", assign({
                            id,
                            name  : field.name,
                            class : css.textarea,
                            required,

                            oninput : m.withAttr("value", (value) => {
                                vnode.state.resize(vnode.attrs, value);
                            })
                        },
                        field.attrs || {}
                    ),
                    data || ""
                )
            )
        );
    }
};
