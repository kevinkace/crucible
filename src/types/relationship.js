import m from "mithril";
import assign from "lodash.assign";
import Awesomplete from "awesomplete";

import db from "../lib/firebase";

import getId from "./lib/getId";
import label from "./lib/label";
import types from "./lib/types.css";
import css from "./relationship.css";

import removeIcon from "../icons/remove.svg";

export default {
    oninit(vnode) {
        const schema  = vnode.attrs.field.schema;

        vnode.state.content = db.child(`content/${schema}`);
        vnode.state.id      = getId(vnode.attrs);
        vnode.state.lookup  = null;
        vnode.state.handle  = null;
        vnode.state.related = null;
        vnode.state.names   = [];
        vnode.state.baseUrl = `content/${schema}/`;

        vnode.state.options = vnode.attrs;

        if (vnode.attrs.data) {
            vnode.state.load();
        }
    },

    config(dom) {
        this.autocomplete = new Awesomplete(dom, {
            minChars  : 3,
            maxItems  : 10,
            autoFirst : true
        });

        this.input = dom;

        dom.addEventListener("awesomplete-selectcomplete", (value) => {
            this.add(value);
        });

        this.autocomplete.list = this.names;

        this.load();
    },

    load() {
        const { content, handle, autocomplete } = this;

        if (handle) {
            return;
        }

        this.handle = content.on("value", snap => {
            this.lookup  = {};
            this.related = snap.val();
            this.names   = [];

            snap.forEach(details => {
                const val = details.val();

                this.names.push(val.name);

                this.lookup[val.name] = details.key();
            });

            if (autocomplete) {
                autocomplete.list = this.names;
                autocomplete.evaluate();
            }

            m.redraw();
        });
    },

    // Set up a two-way relationship between these
    add(e) {
        const { options, content } = this;
        const key = this.lookup[e.target.value];

        if (!key) {
            console.error(e.target.value);

            return;
        }

        e.target.value = "";

        options.update(options.path.concat(key), true);

        if (options.root) {
            content.child(`${key}/relationships/${options.root.key()}`).set(true);
        }
    },

    // BREAK THE RELATIONSHIP
    remove(key, e) {
        const { options, content } = this;

        e.preventDefault();

        options.update(options.path.concat(key));

        if (options.root) {
            content.child(`${key}/relationships/${options.root.key()}`).remove();
        }
    },

    view(vnode) {
        const { id, autocomplete, related, baseUrl } = vnode.state;
        const { field, class : style, data } = vnode.attrs;

        return m("div", { class : style },
            m(label, { id, field }),
            m("input", assign(field.attrs || {}, {
                id,
                class : types.relationship,

                oncreate({ dom }) {
                    vnode.state.config(dom);
                },

                onkeydown(e) {
                    if (e.keyCode !== 9 || autocomplete.opened === false) {
                        return;
                    }

                    autocomplete.select();
                }
            })),
            m("ul", { class : css.relationships },
                data ?
                    Object.keys(data).map(key =>
                        m("li", { class : css.li },
                            related ?
                                m("div", { class : css.relationship },
                                    m("a", {
                                            href  : `${baseUrl}${key}`,
                                            class : css.link
                                        },
                                        related[key].name
                                    ),
                                    m("div", { class : css.actions },
                                        m("button", {
                                                class : css.button,
                                                title : "Remove",
                                                value : "Remove",
                                                onclick(e) {
                                                    vnode.state.remove(key, e);
                                                }
                                            },
                                            m.trust(removeIcon)
                                        )
                                    )
                                ) :
                                "Loading..."
                        )
                    ) :
                    null
            )
        );
    }
};
