import m from "mithril";
import assign from "lodash.assign";
import Awesomeplete from "awesomplete";

import db from "../lib/firebase";

import id from "./lib/id";
import label from "./lib/label";
import types from "./lib/types.css";

import removeIcon from "../icons/remove.svg";

import css from "./relationship.css";

export default {
    oninit : function(vnode) {
        var schema  = vnode.attrs.field.schema,
            content = db.child("content/" + schema);

        vnode.state.id      = id(vnode.attrs);
        vnode.state.lookup  = null;
        vnode.state.handle  = null;
        vnode.state.related = null;
        vnode.state.names   = [];
        vnode.state.baseUrl = "content/" + schema + "/";

        vnode.state.attrs = vnode.attrs;

        vnode.state.load = function() {
            if(vnode.state.handle) {
                return;
            }

            vnode.state.handle = content.on("value", function(snap) {
                vnode.state.lookup  = {};
                vnode.state.related = snap.val();
                vnode.state.names   = [];

                snap.forEach(function(details) {
                    var val = details.val();

                    vnode.state.names.push(val.name);

                    vnode.state.lookup[val.name] = details.key();
                });

                if(vnode.state.autocomplete) {
                    vnode.state.autocomplete.list = vnode.state.names;
                    vnode.state.autocomplete.evaluate();
                }

                m.redraw();
            });
        };

        // Set up a two-way relationship between these
        vnode.state.add = function(e) {
            var key = vnode.state.lookup[e.target.value];

            if(!key) {
                console.error(e.target.value);

                return;
            }

            e.target.value = "";

            vnode.state.attrs.update(vnode.state.attrs.path.concat(key), true);

            if(vnode.state.attrs.root) {
                content.child(key + "/relationships/" + vnode.state.attrs.root.key()).set(true);
            }
        };

        // BREAK THE RELATIONSHIP
        vnode.state.remove = function(key, e) {
            e.preventDefault();

            vnode.state.attrs.update(vnode.state.attrs.path.concat(key));

            if(vnode.state.attrs.root) {
                content.child(key + "/relationships/" + vnode.state.attrs.root.key()).remove();
            }
        };

        if(vnode.attrs.data) {
            vnode.state.load();
        }
    },

    view : function(vnode) {
        var field  = vnode.attrs.field;

        vnode.state.attrs = vnode.attrs;

        return m("div", { class : vnode.attrs.class },
            label(vnode.state, vnode.attrs),
            m("input", assign(field.attrs || {}, {
                // Attrs
                id     : vnode.state.id,
                class  : types.relationship,

                oncreate : function(inputVnode) {
                    vnode.state.autocomplete = new Awesomeplete(inputVnode.dom, {
                        minChars  : 3,
                        maxItems  : 10,
                        autoFirst : true
                    });

                    vnode.state.input = inputVnode;

                    inputVnode.dom.addEventListener("awesomplete-selectcomplete", vnode.state.add);

                    vnode.state.autocomplete.list = vnode.state.names;

                    vnode.state.load();
                },

                // Events
                onkeydown : function(e) {
                    if(e.keyCode !== 9 || vnode.state.autocomplete.opened === false) {
                        return;
                    }

                    vnode.state.autocomplete.select();
                }
            })),
            m("ul", { class : css.relationships },
                vnode.attrs.data && Object.keys(vnode.attrs.data).map(function(key) {
                    return m("li", { class : css.li },
                        vnode.state.related ?
                            m("div", { class : css.relationship },
                                    m("a", {
                                        href  : vnode.state.baseUrl + key,
                                        class : css.link
                                    }, vnode.state.related[key].name),
                                m("div", { class : css.actions },
                                    m("button", {
                                            class   : css.button,
                                            onclick : vnode.state.remove.bind(vnode.state, key),
                                            title   : "Remove",
                                            value   : "Remove"
                                        },
                                        m.trust(removeIcon)
                                    )
                                )
                            ) :
                            "Loading..."
                    );
                })
            )
        );
    }
};
