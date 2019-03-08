import m from "mithril";
import assign from "lodash.assign";

import children from "./children.js";

import css from "./fieldset.css";

export default {
    view(vnode) {
        const { class : style, field } = vnode.attrs;

        return m("fieldset", { class : style },
            field.name ? m("legend", { class : css.legend }, field.name) : null,

            m(children, assign({}, vnode.attrs, {
                fields : field.children
            }))
        );
    }
};
