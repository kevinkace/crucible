import m from "mithril";

import capitalize from "lodash.capitalize";
import name from "./name.js";
import children from "../../types/children.js";

import css from "./form.css";
import layout from "../layout/layout.css";

export default {
    view(vnode) {
        const { content } = vnode.attrs;
        const state   = content.get();
        const status  = state.meta.status;

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
                        class : css.form,
                        oncreate({ dom }) {
                            content.registerForm(dom);

                            // force a redraw so publishing component can get
                            // new args w/ actual validity
                            m.redraw();
                        }
                    },
                    m("input", {
                            class : css[status],
                            type  : "text",
                            value : name(state.schema, state.meta),

                            oninput : m.withAttr("value", (value) => {
                                content.titleChange(value);
                            })
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
};
