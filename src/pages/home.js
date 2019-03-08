import m from "mithril";

import layout from "./layout";

import css from "./layout/layout.css";

export default {
    view() {
        return m(layout, { title : "Home" },
            m("div", { class : css.content },
                m("div", { class : css.body },
                    m("ul",
                        m("li",
                            m("a", { href : "/" }, "Back to CMS home")
                        )
                    )
                )
            )
        );
    }
};
