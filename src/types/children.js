import m from "mithril";
import get from "lodash.get";
import assign from "lodash.assign";

import input from "./lib/input.js";
import checkHidden from "./lib/hide.js";
import addClasses from "./lib/classer.js";

import css from "./lib/types.css";

// Bound below
let types;

export default {
    view(vnode) {
        const { content, fields = [], registerHidden, state, data, path, class : style } = vnode.attrs;

        return m("div", { class : style ? style : "" },
            fields.map((field, index) => {
                const component = types[field.type || field];

                let wasHidden,
                    isHidden;

                if (!component) {
                    return m("div",
                        m("p", "Unknown component"),
                        m("pre", JSON.stringify(field, null, 4))
                    );
                }

                if (field.show) {
                    wasHidden = field.show.hidden;
                    field.show.hidden = checkHidden(state, field);

                    if (field.show.hidden !== wasHidden) {
                        // hidden status changed, notify the controller.
                        registerHidden(field.key, field.show.hidden);
                        m.redraw();
                    }
                }

                isHidden = get(field, "show.hidden");

                return m(component, assign({}, vnode.attrs, {
                    field   : field,
                    content : content,
                    update  : content.setField.bind(content),

                    class : addClasses(field, index ? css.field : css.first),
                    data  : get(data, field.key),
                    path  : path.concat(field.key),

                    required : !isHidden && field.required
                }));
            })
        );
    }
};

// Structural
import fieldset from "./fieldset.js";
import repeating from "./repeating.js";
import split from "./split.js";
import tabs from "./tabs.js";

// Non-input fields
import instructions from "./instructions.js";

// Custom input types
import relationship from "./relationship.js";
import markdown from "./markdown.js";
import textarea from "./textarea.js";
import upload from "./upload.js";

// Implementations based on lib/multiple.js
import select from "./select.js";
import radio from "./radio.js";
import checkbox from "./checkbox.js";

// Have to bind these down here to avoid circular binding issues
types = {
    // Structural
    fieldset,
    repeating,
    split,
    tabs,

    // Non-input fields
    instructions,

    // Custom input types
    relationship,
    markdown,
    textarea,
    upload,

    // Implementations based on lib/multiple.js
    select,
    radio,
    checkbox,

    // Implementations based on lib/input.js
    date     : input("date"),
    datetime : input("datetime-local"),
    email    : input("email"),
    number   : input("number"),
    text     : input("text"),
    time     : input("time"),
    url      : input("url")
};
