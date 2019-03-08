import m from "mithril";
import assign from "lodash.assign";

import children from "./children";
import instructions from "./instructions";

import css from "./split.css";

export default {
    view(vnode) {
        const { field } = vnode.attrs;

        return m("div", { class : css.container },
            field.instructions ? m(instructions, { field : field.instructions }) : null,

            (field.children || []).map(section =>
                m("div", { class : css.section },
                    m(children, assign({}, vnode.attrs, {
                        // Don't want to repeat any incoming class that children might've passed in
                        class  : false,
                        fields : section.children
                    }))
                )
            )
        );
    }
};
