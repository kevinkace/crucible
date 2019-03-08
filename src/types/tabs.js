import m from "mithril";
import assign from "lodash.assign";

import children from "./children";
import css from "./tabs.css";

export default {
    oninit(vnode) {
        vnode.state.tabIdx = 0;
    },

    view(vnode) {
        const { tabIdx } = vnode.state;
        const { field, class : style, data, path } = vnode.attrs;
        const tabs = field.children || [];

        return m("div", { class : style },
            m("div", { class : css.nav },
                tabs.map((tab, idx) =>
                    m("a", {
                            class : idx === tabIdx ? css.activeTab : css.tab,
                            href  : `#${idx}`,
                            onclick(e) {
                                e.preventDefault();
                                vnode.state.tabIdx = idx;
                            }
                        },
                        tab.name
                    )
                )
            ),
            tabs.map((tab, idx) =>
                m("div", { class : idx === tabIdx ? css.activeBody : css.body },
                    m(children, assign({}, vnode.attrs, {
                        class  : false,
                        fields : tab.children,
                        data   : data && data[tab.key],
                        path   : path.concat(tab.key)
                    }))
                )
            )
        );
    }
};
