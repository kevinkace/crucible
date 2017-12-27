import m from "mithril";

import get from "lodash.get";
import merge from "lodash.merge";
import assign from "lodash.assign";
import capitalize from "lodash.capitalize";

import db from "../../lib/firebase.js";
import watch from "../../lib/watch.js";
import prefix from "../../lib/prefix.js";

import * as layout from "../layout/index.js";
import * as head from "./head.js";
import * as formView from "./form.js";

import Content from "./content-state.js";

import css from "./form.css";

export function oninit(vnode) {
    var id     = m.route.param("id"),
        schema = db.child("schemas/" + m.route.param("schema")),
        ref    = db.child("content/" + m.route.param("schema") + "/" + id),

        content;

    // Ensure we have no lingering event listeners.
    schema.off();
    ref.off();

    vnode.state.id     = id;
    vnode.state.ref    = ref;
    vnode.state.form   = null;
    vnode.state.data   = {};
    vnode.state.hidden = [];
    vnode.state.loading = true;

    // New state for every page change.
    vnode.state.content = content = new Content();

    // No sense doing any work if we don't have an id to operate on
    if(!id) {
        return;
    }

    schema.on("value", function(snap) {
        content.setSchema(snap.val(), snap.key());

        m.redraw();
    });


    // On updates from firebase we need to merge in fields carefully
    ref.on("value", function(snap) {
        var data = snap.val(),
            state = content.get();

        // Don't try to grab non-existent data
        if(!snap.exists()) {
            return m.route.set(prefix("/listing/" + m.route.param("schema")));
        }

        content.processServerData(data, ref);

        vnode.state.data = assign(data, {
            fields : merge(data.fields, state.fields)
        });

        vnode.state.loading = false;

        return m.redraw();
    });

    watch(ref);
}

export function view(vnode) {
    var state = vnode.state.content.get(),
        title;

    if(!state.schema) {
        return m.component(layout, { loading : true });
    }

    title = [ get(state.meta, "name"), get(state.schema, "name") ]
        .filter(Boolean)
        .map(capitalize)
        .join(" | ");

    if(!vnode.state.id) {
        m.route.set(prefix("/listing/" + state.schema.key));
    }

    return m.component(layout, {
        title   : title,
        loading : vnode.state.loading,
        content : [
            m("div", { class : layout.css.content },
                m.component(head,     { content : vnode.state.content }),
                m.component(formView, { content : vnode.state.content })
            )
        ]
    });
}
