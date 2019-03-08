import m from "mithril";

import get from "lodash.get";
import merge from "lodash.merge";
import assign from "lodash.assign";
import capitalize from "lodash.capitalize";

import db from "../../lib/firebase.js";
import watch from "../../lib/watch.js";
import prefix from "../../lib/prefix.js";

import layout, { layoutCss } from "../layout/index.js";
import head from "./head.js";
import form from "./form.js";

import Content from "./Content.js";

export default {
    oninit(vnode) { // eslint-disable-line max-statements
        const id         = m.route.param("id");
        const schemaRef  = db.child(`schemas/${m.route.param("schema")}`);
        const contentRef = db.child(`content/${m.route.param("schema")}/${id}`);

        let content;

        // Ensure we have no lingering event listeners.
        schemaRef.off();
        contentRef.off();

        vnode.state.id         = id;
        vnode.state.contentRef = contentRef;
        vnode.state.form       = null;
        vnode.state.data       = {};
        vnode.state.hidden     = [];
        vnode.state.loading    = true;

        // New state for every page change.
        vnode.state.content = content = new Content();

        // No sense doing any work if we don't have an id to operate on
        if (!id) {
            return;
        }

        // if the schema for the post currently being edited is updated, we want to update the post fields
        schemaRef.on("value", snap => {
            content.setSchema(snap.val(), snap.key());

            m.redraw();
        });


        // On updates from firebase we need to merge in fields carefully
        contentRef.on("value", snap => {
            const data  = snap.val();
            const state = content.get();

            // Don't try to grab non-existent data
            if (!snap.exists()) {
                return m.route.set(prefix(`/${m.route.param("schema")}`));
            }

            content.mergeServerContent(data, contentRef);

            vnode.state.data = assign(data, {
                fields : merge(data.fields, state.fields)
            });

            vnode.state.loading = false;

            return m.redraw();
        });

        watch(contentRef);
    },

    view(vnode) {
        const { content, id, loading } = vnode.state;
        const state = content.get();

        let title;

        if (!state.schema) {
            return m(layout, { loading : true });
        }

        title = [ get(state.meta, "name"), get(state.schema, "name") ]
            .filter(Boolean)
            .map(capitalize)
            .join(" | ");

        if (!id) {
            m.route.set(prefix(`/${state.schema.key}`));
        }

        return m(layout, { title, loading },
            m("div", { class : layoutCss.content },
                m(head, { content }),
                m(form, { content })
            )
        );
    }
};
