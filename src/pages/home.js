import m from "mithril";

import * as layout from "./layout/index";

import css from "./home.css";

import { version } from "../../package.json";

export function view() {
    return m.component(layout, {
        title   : "Home",
        content : m("div", { class : css.content },
            m("div", { class : css.body },
                m("h1", { class : css.logo },
                    "Crucible", m("span", " v" + version)
                ),
                m("ul",
                    m("li",
                        m("a", { href : "/schemas", config : m.route }, "Schemas")
                    ),
                    m("li",
                        m("a", { href : "/content", config : m.route }, "Content")
                    )
                )
            )
        )
    });
}
