import m from "mithril";

import css from "./checkbox.css";
import multiple from "./lib/multiple";

export default multiple({ multiple : true },
    // View function
    (state, attrs, children) => {
        const field = attrs.field;

        return (children || []).map(opt =>
            m("label", { class : css.checkbox },
                m("input", {
                    type    : "checkbox",
                    name    : field.name,
                    value   : opt.value,
                    checked : opt.selected,

                    required : attrs.required,

                    onchange : m.withAttr("checked", value => {
                        state.value(attrs, opt.key, value && opt.value);
                    })
                }),
                ` ${opt.name}`
            )
        );
    }
);
