import m from "mithril";
import assign from "lodash.assign";

import getId from "./getId";
import label from "./label";

/**
 * Examples of `multiple` types include `checkbox.js` and `radio.js`,
 * in both cases you're very likely or certain to have multiple inputs
 * defined in a single field definition. (See README for examples.)
 */

export default function(args, view) {
    return {
        oninit(vnode) {
            vnode.state.id = getId(vnode.attrs);
        },

        // Figure out selected status for children
        selected(attrs) {
            const field  = attrs.field;
            const values = attrs.data;

            let matches;

            if (!values) {
                return field.children;
            }

            matches = field.children.filter(opt =>
                (!args.multiple ?
                    opt.value === values :
                    values[opt.key] === opt.value)
            );

            if (!args.multiple && matches.length) {
                matches.length = 1;
            }

            return field.children.map(opt =>
                assign({}, opt, {
                    selected : matches.indexOf(opt) > -1
                })
            );
        },

        value(opts, key, value) {
            return opts.update(
                args.multiple ? opts.path.concat(key) : opts.path,
                value
            );
        },

        view(vnode) {
            const { class : style, field } = vnode.attrs;
            const { id } = vnode.state;
            const children = vnode.state.selected(vnode.attrs);

            return m("div", { class : style },
                m(label, { id, field }),
                view(vnode.state, vnode.attrs, children)
            );
        }
    };
}
