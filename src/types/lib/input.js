import m from "mithril";
import assign from "lodash.assign";
import get from "lodash.get";

import getId from "./getId";
import label from "./label";

import css from "./types.css";

// todo: convert to normal component ?
export default function(type) {
    return {
        oninit(vnode) {
            const { content, field, root } = vnode.attrs;
            const val = get(field, "attrs.value");

            vnode.state.id = getId(vnode.attrs);

            // tivac/crucible#96
            // If this is a new item (never been updated) set the default value
            // Don't want to use that value on every render because it is bad UX,
            // the user becomes unable to clear out the field
            if (val && root) {
                root.child("updated_at").on("value", snap => {
                    if (snap.exists()) {
                        return;
                    }

                    content.setField(vnode.attrs.path, val);

                    m.redraw();
                });
            }
        },

        view(vnode) {
            const { id } = vnode.state;
            const { content, field, class : style, data, required, path } = vnode.attrs;

            return m("div", { class : style },
                m(label, { id, field }),
                m("input", assign({}, field.attrs || {}, {
                        id,
                        name  : field.name,
                        type  : type || "text",
                        class : css[type || "text"],
                        value : data || "",
                        required,

                        oninput : m.withAttr("value", value => {
                            content.setField(path, value);
                        })
                    }
                ))
            );
        }
    };
}
