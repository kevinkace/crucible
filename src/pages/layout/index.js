import m from "mithril";

import config, { title as siteTitle } from "../../config";
import db from "../../lib/firebase";
import auth from "../../lib/valid-auth";
import prefix from "../../lib/prefix";

import header from "./header.css";
import layout from "./layout.css";
import loading from "./loading.css";

// exporting so others can use it more easily
export { layout as layoutCss };

export default {
    oninit(vnode) {
        vnode.state.schemas = [];
        vnode.state.auth = auth();

        db.child("schemas").on("value", snap => {
            vnode.state.schemas = [];

            snap.forEach(schema => {
                const val = schema.val();

                val.key = schema.key();

                vnode.state.schemas.push(val);
            });

            m.redraw();
        });
    },

    view(vnode) {
        const locked      = config.locked;
        const schemaParam = m.route.param("schema");

        const { schemas, auth : _auth } = vnode.state;
        const { title = "Loading...", loading : _loading } = vnode.attrs;

        document.title = `${title} | ${siteTitle}`;

        return m("div", { class : layout.container },

            _loading ?
                m("div", { class : loading.bar }) :
                null,

            m("div", { class : header.header },

                m("a", {
                        class    : header.headerHd,
                        href     : prefix("/"),
                        oncreate : m.route.link
                    },
                    m("h1", { class : header.title }, siteTitle)
                ),

                m("div", { class : header.headerBd },
                    _auth ?
                        [
                            m("div", { class : header.schemas },
                                schemas.map(schema =>
                                    m("a", {
                                            class    : schemaParam === schema.key ? header.active : header.schema,
                                            href     : prefix(`/${schema.key}`),
                                            oncreate : m.route.link
                                        },
                                        schema.name
                                    )
                                )
                            ),

                            !locked ?
                                m("a", {
                                    class    : header.add,
                                    href     : prefix("/new-schema"),
                                    oncreate : m.route.link
                                }, "New Schema") :
                                null,

                            m("a", {
                                class    : header.logout,
                                href     : prefix("/logout"),
                                oncreate : m.route.link
                            }, "Logout")
                        ] :
                        null
                )
            ),
            vnode.children ? vnode.children : null
        );
    }
};
