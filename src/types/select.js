import m from "mithril";
import assign from "lodash.assign";

import css from "./select.css";
import multiple from "./lib/multiple.js";

export default multiple({ multiple : false },
    (state, attrs, children) => {
        const { field, required } = attrs;

        return m("select", assign({
                    name  : field.name,
                    class : css.select,
                    required,

                    onchange(e) {
                        const { key, value } = children[e.target.selectedIndex];

                        state.value(attrs, key, value);
                    }
                },
                field.attrs
            ),

            children.map(option =>
                m("option", assign({}, option.attrs, {
                        value    : option.value,
                        selected : option.selected ? "selected" : null
                    }),
                    option.name
                )
            )
        );
    }
);
