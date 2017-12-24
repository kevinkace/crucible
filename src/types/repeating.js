import m from "mithril";
import assign from "lodash.assign";
import times from "lodash.times";
    
import removeIcon from "../icons/remove.svg";

import * as children from "./children";

import css from "./repeating.css";

function child(state, attrs, data, idx) {
    return m("div", { class : css[idx === 0 ? "first" : "child"] },
        m("div", { class : css.meta },
            m("p", { class : css.counter }, idx + 1),
            m("button", {
                    class   : css.remove,
                    onclick : state.remove.bind(null, attrs, data, idx)
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
    oninit : function(vnode) {
        vnode.state.children = (vnode.attrs.data && vnode.attrs.data.length) || 1;
        
        vnode.state.add = function(opts, e) {
            e.preventDefault();
            
            vnode.state.children += 1;

            // Ensure that we have data placeholders for all the possible entries
            times(vnode.state.children, function(idx) {
                if(opts.data && opts.data[idx]) {
                    return;
                }
                
                // Need a key here so that firebase will save this object,
                // otherwise future loads can have weird gaps
                opts.update(opts.path.concat(idx), { __idx : idx });
            });
        };

        vnode.state.remove = function(opts, data, idx, e) {
            e.preventDefault();
            
            if(Array.isArray(opts.data)) {
                opts.data.splice(idx, 1);
                
                vnode.state.children = opts.data.length;
            } else {
                --vnode.state.children;
            }
            
            opts.update(opts.path, opts.data);
        };
    },

    view : function(vnode) {
        var field = vnode.attrs.field,
            items;
        
        if(vnode.attrs.data) {
            items = vnode.attrs.data.map(child.bind(null, vnode.state, vnode.attrs));
        } else {
            items = times(vnode.state.children, child.bind(null, vnode.state, vnode.attrs, false));
        }
        
        return m("div", { class : vnode.attrs.class + " " + css.container },
            items,
            m("button", {
                class   : css.add,
                onclick : vnode.state.add.bind(null, vnode.attrs)
            }, field.button || "Add")
        );
    }
};
