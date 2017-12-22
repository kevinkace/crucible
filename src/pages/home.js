import m from "mithril";

import config from "../config";
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

                !config.locked ?
                    m("a", {
                        class  : css.add,
                        href   : "/content/new",
                        config : m.route
                    }, "New Schema") :
                    null
            )
        )
    });
}
