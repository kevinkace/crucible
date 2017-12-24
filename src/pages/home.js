import m from "mithril";

import * as layout from "./layout/index";

import css from "./layout/layout.css";

export function view() {
    return m(layout, {
        title   : "Home",
        content : m("div", { class : css.content },
            m("div", { class : css.body },
                m("ul",
                    m("li",
                        m("a", { href : "/schemas", oncreate: m.route.link }, "Schemas")
                    ),
                    m("li",
                        m("a", { href : "/content", oncreate: m.route.link }, "Content")
                    )
                )
            )
        )
    });
}
