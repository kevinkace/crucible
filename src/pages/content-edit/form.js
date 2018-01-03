import m from "mithril";

import capitalize from "lodash.capitalize";
import name from "./name.js";
import * as children from "../../types/children.js";

import css from "./form.css";
import layout from "../layout/layout.css";

export function view(vnode) {
    var content = vnode.attrs.content,
        state   = content.get(),
        status  = state.meta.status;

    return m("div", { class : layout.body },
        m("div", { class : css.contentsContainer },
            m("div", { class : css.itemStatus },
                m("p", { class : css.status },
                    m("span", { class : css.statusLabel },
                        "Status: "
                    ),
                    capitalize(state.meta.status)
                )
            ),
            m("form", {
                    class  : css.form,
                    oncreate : function(formVnode) {
                        content.registerForm(formVnode);

                        // force a redraw so publishing component can get
                        // new args w/ actual validity
                        m.redraw();
                    }
                },
                m("input", {
                        // Attrs
                        class : css[status],
                        type  : "text",
                        value : name(state.schema, state.meta),

                        // Events
                        oninput : m.withAttr("value", content.titleChange.bind(content))
                    }
                ),
                m(children, {
                    class  : css.children,
                    data   : state.fields || {},
                    fields : state.schema.fields,
                    path   : [ "fields" ],
                    state  : state.fields,

                    update  : content.setField.bind(content),
                    content : content,

                    registerHidden : content.hidden.register.bind(content.hidden)
                })
            )
        )
    );
}
