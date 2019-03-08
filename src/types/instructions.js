import m from "mithril";

import css from "./instructions.css";

export default {
    view(vnode) {
        const { field, class : style } = vnode.attrs;

        return m("div", { class : style },
            field.head ? m("p", { class : css.head }, field.head) : null,
            field.body ? m("p", field.body) : null
        );
    }
};
