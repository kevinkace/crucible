import m from "mithril";

import css from "./types.css";

export default {
    view(vnode) {
        const { id, field } = vnode.attrs;

        let name = field.name;
        let style = css.label;

        if (field.required) {
            name += "*";
            style = css.required;
        }

        return m("label", {
            for   : id,
            class : style
        }, name);
    }
};
