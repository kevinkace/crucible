import m from "mithril";
import sluggo from "sluggo";

import db from "../lib/firebase";
import prefix from "../lib/prefix";

import * as layout from "./layout/index";
import css from "./schema-new.css";

export function oninit(vnode) {
    vnode.state.name = "";
    vnode.state.slug = false;

    vnode.state.oninput = function(name) {
        vnode.state.name = name;
        vnode.state.slug = sluggo(name);
    };

    vnode.state.onsubmit = function(e) {
        e.preventDefault();

        db.child("schemas/" + vnode.state.slug).set({
            name    : vnode.state.name,
            created : db.TIMESTAMP,
            updated : db.TIMESTAMP
        });

        m.route.set(prefix("/content/" + vnode.state.slug + "/edit"));
    };
}

export function view(vnode) {
    return m(layout, {
        title   : "Create a Schema",
        content : m("div", { class : layout.css.content },
            m("div", { class : layout.css.body },
                m("h1", { class : layout.css.title }, "New Schema"),
                m("form", {
                        class    : css.form,
                        onsubmit : vnode.state.onsubmit
                    },
                    m("div", { class : css.row },
                        m("label", { class : css.label }, "Name: "),
                        m("input[name=name]", {
                            class   : css.name,
                            oninput : m.withAttr("value", vnode.state.oninput),
                            value   : vnode.state.name
                        })
                    ),
                    m("div", { class : css.row },
                        m("span", { class : css.label }, "Slug: "),
                        m("span", { class : css.slug }, (vnode.state.slug || "???"))
                    ),
                    m("input[type=submit]", {
                        class : css.add,
                        value : "Add schema"
                    })
                )
            )
        )
    });
}
