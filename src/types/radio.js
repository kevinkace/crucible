import m from "mithril";
import assign from "lodash.assign";

import css from "./radio.css";
import multiple from "./lib/multiple";

export default multiple({ multiple : false },
    (state, attrs, children) => {
        const { field } = attrs;

        return (children || []).map(opt =>
            m("label", { class : css.choice },
                m("input", assign({}, opt.attrs, {
                    type     : "radio",
                    name     : field.name,
                    value    : opt.value,
                    checked  : opt.selected,
                    required : attrs.required,

                    onchange() {
                        state.value(attrs, opt.key, opt.value);
                    }
                })),
                ` ${opt.name}`
            )
        );
    }
);
