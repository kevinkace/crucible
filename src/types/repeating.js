import m from "mithril";
import assign from "lodash.assign";
import times from "lodash.times";

import children from "./children";

import css from "./repeating.css";

import removeIcon from "../icons/remove.svg";

function child(state, attrs, data, idx) {
    return m("div", { class : css[idx === 0 ? "first" : "child"] },
        m("div", { class : css.meta },
            m("p", { class : css.counter }, idx + 1),
            m("button", {
                    class : css.remove,
                    onclick(e) {
                        e.preventDefault();
                        state.remove(attrs, data, idx);
                    }
                },
                m.trust(removeIcon)
            )
        ),
        m(children, assign({}, attrs, {
            fields : attrs.field.children,
            class  : css.fields,
            data   : data,
            path   : attrs.path.concat(idx)
        }))
    );
}

export default {
    oninit(vnode) {
        vnode.state.children = (vnode.attrs.data && vnode.attrs.data.length) || 1;
    },

    add(attrs) {
        this.children += 1;

        // Ensure that we have data placeholders for all the possible entries
        times(this.children, idx => {
            if (attrs.data && attrs.data[idx]) {
                return;
            }

            // Need a key here so that firebase will save this object,
            // otherwise future loads can have weird gaps
            attrs.update(attrs.path.concat(idx), { __idx : idx });
        });
    },

    remove(opts, data, idx) {
        if (Array.isArray(opts.data)) {
            opts.data.splice(idx, 1);

            this.children = opts.data.length;
        } else {
            --this.children;
        }

        opts.update(opts.path, opts.data);
    },

    view(vnode) {
        const { class : style, field, data } = vnode.attrs;

        return m("div", { class : `${style} ${css.container}` },
            data ?
                data.map((d, idx) => child(vnode.state, vnode.attrs, d, idx)) :
                times(vnode.state.children, idx => child(vnode.state, vnode.attrs, false, idx)),
            m("button", {
                class : css.add,
                onclick(e) {
                    e.preventDefault();
                    vnode.state.add(vnode.attrs, e);
                }
            }, field.button || "Add")
        );
    }
};
