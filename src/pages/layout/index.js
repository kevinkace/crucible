import m from "mithril";

import config, { title } from "../../config";
import db from "../../lib/firebase";
import auth from "../../lib/valid-auth";
import prefix from "../../lib/prefix";

import header from "./header.css";
import layout from "./layout.css";
import loading from "./loading.css";

// exporting so others can use it more easily
export { layout as css };

export function oninit(vnode) {
    vnode.state.schemas = null;
    vnode.state.auth = auth();

    vnode.state.add = function() {
        m.route.set(prefix("/content/new"));
    };

    db.child("schemas").on("value", function(snap) {
        vnode.state.schemas = [];

        snap.forEach(function(schema) {
            var val = schema.val();

            val.key = schema.key();

            vnode.state.schemas.push(val);
        });

        m.redraw();
    });
}

export function view(vnode) {
    var current = m.route.get(),
        locked  = config.locked;

    if(!vnode.attrs) {
        vnode.attrs = false;
    }

    document.title = (vnode.attrs.title || "Loading...") + " | " + title;

    return m("div", { class : layout.container },
        vnode.attrs && vnode.attrs.loading ?
            m("div", { class : loading.bar }) :
            null,

        m("div", { class : header.header },

            m("a", {
                    class    : header.headerHd,
                    href     : prefix("/"),
                    oncreate : m.route.link
                },
                m("h1", { class : header.title }, title)
            ),

            m("div", { class : header.headerBd },
                vnode.state.auth ? [
                    m("div", { class : header.schemas },
                        (vnode.state.schemas || []).map(function(schema) {
                            var searchUrl = prefix("/content/" + schema.key),
                                targetUrl = prefix("/listing/" + schema.key),
                                active;

                            active = current.indexOf(searchUrl) === 0 || current.indexOf(targetUrl) === 0;

                            return m("a", {
                                    class    : header[active ? "active" : "schema"],
                                    href     : targetUrl,
                                    oncreate : m.route.link
                                },
                                schema.name
                            );
                        })
                    ),

                    m("button", {
                        // Attrs
                        class    : header.add,
                        disabled : locked || null,

                        // Events
                        onclick : vnode.state.add
                    }, "New Schema"),

                    m("a", {
                        class    : header.logout,
                        href     : prefix("/logout"),
                        oncreate : m.route.link
                    }, "Logout")
                ] :
                null
            )
        ),
        vnode.attrs.content ? vnode.attrs.content : null
    );
}
