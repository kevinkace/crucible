import m from "mithril";
import sluggo from "sluggo";

import db from "../lib/firebase";
import prefix from "../lib/prefix";

import layout, { layoutCss } from "./layout";
import css from "./schema-new.css";

export default {
    oninit(vnode) {
        vnode.state.name = "";
        vnode.state.slug = false;
    },

    oninput(name) {
        this.name = name;
        this.slug = sluggo(name);
    },

    onsubmit() {
        const { slug, name } = this;

        db.child(`schemas/${slug}`).set({
            name,
            created : db.TIMESTAMP,
            updated : db.TIMESTAMP
        });

        m.route.set(prefix(`/${slug}/edit`));
    },

    view(vnode) {
        const { name, slug } = vnode.state;

        return m(layout, { title : "Create a Schema" },
            m("div", { class : layoutCss.content },
                m("div", { class : layoutCss.body },
                    m("h1", { class : layoutCss.title }, "New Schema"),
                    m("form", {
                            class : css.form,
                            onsubmit(e) {
                                e.preventDefault();
                                vnode.state.onsubmit();
                            }
                        },
                        m("div", { class : css.row },
                            m("label", { class : css.label }, "Name: "),
                            m("input[name=name]", {
                                class   : css.name,
                                value   : name,
                                oninput : m.withAttr("value", value => {
                                    vnode.state.oninput(value);
                                })
                            })
                        ),
                        m("div", { class : css.row },
                            m("span", { class : css.label }, "Slug: "),
                            m("span", { class : css.slug }, (slug || "???"))
                        ),
                        m("input[type=submit]", {
                            class : css.add,
                            value : "Add schema"
                        })
                    )
                )
            )
        );
    }
};
