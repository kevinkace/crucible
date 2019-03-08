import m from "mithril";
import format from "date-fns/format";

import getItemStatus from "../../lib/item-status.js";
import prefix from "../../lib/prefix.js";
import name from "../content-edit/name.js";

import css from "./table.css";

import removeIcon from "../../icons/remove.svg";
import previewIcon from "../../icons/preview.svg";

const dateFormat = "MM/DD/YYYY";

export default {
    view(vnode) {
        const {
            doOrderBlink, resetOrderBlink,
            orderBy,
            content, schema, locked, remove
        } = vnode.attrs;

        return m("table", { class : css.table },
            m("thead", { class : css.tableHeader },
                m("tr",
                    m("th", { class : css.headerName }, "Name"),
                    m("th", { class : css.headerStatus }, "Status"),
                    m("th", { class : css.headerScheduled }, "Scheduled"),
                    m("th", {
                            class : css.headerOrderedBy,
                            oncreate({ dom }) {
                                if (dom.classList.contains(css.blink)) {
                                    dom.classList.remove(css.blink);
                                    m.redraw();
                                } else if (doOrderBlink) {
                                    resetOrderBlink();

                                    dom.classList.add(css.blink);
                                    m.redraw();
                                }
                            }
                        }, orderBy.label),
                    m("th", { class : css.headerActions }, "Actions")
                )
            ),
            m("tbody",
                content
                .sort((a, b) => b.order_by - a.order_by)
                .map((data, idx) => {
                    const orderByValue = orderBy.value;
                    const now = Date.now();
                    const itemRoute = prefix(`/${schema.key}/${data.key}`);

                    let itemStatusCss = css.itemName,

                        itemName,
                        itemStatus,

                        itemOrderedBy,
                        itemSchedule;

                    if (data.published_at) {
                        itemStatusCss = css.itemNamePublished;
                    }

                    if (data.published_at > now) {
                        itemStatusCss = css.itemNameScheduled;
                    }

                    if (data.unpublished_at < now) {
                        itemStatusCss = css.itemNameUnpublished;
                    }

                    itemStatus = getItemStatus(data);

                    itemName = name(schema, data);
                    itemOrderedBy = data[orderByValue] ? format(data[orderByValue], dateFormat) : "--/--/----";
                    itemSchedule = data.published_at ? format(data.published_at, dateFormat) : "--/--/----";

                    return m("tr", {
                            key   : data.key,
                            class : css.row,
                            style : {
                                animationDelay : `${20 * idx}ms`
                            },
                            onclick() {
                                m.route.set(itemRoute);
                            }
                        },
                        m("td", {
                                class : itemStatusCss,
                                title : itemName
                            },
                            // <tr> click handler does the navigation, this is just for the hover tooltip
                            m("a", {
                                href : itemRoute,
                                onclick(e) {
                                    e.preventDefault();
                                }
                            }, itemName)
                        ),
                        m("td", {
                                class : css.itemStatus,
                                title : itemStatus
                            },
                            itemStatus
                        ),
                        m("td", {
                                class : css.itemScheduled,
                                title : itemSchedule
                            },
                            itemSchedule
                        ),
                        m("td", {
                                class : css.itemOrderedBy,
                                title : itemOrderedBy
                            },
                            itemOrderedBy
                        ),
                        m("td", { class : css.itemActions },
                            m("div", { class : css.actionsPanel },
                                m("button", {
                                        class    : css.remove,
                                        title    : `Remove: ${itemName}`,
                                        disabled : locked || null,
                                        onclick(e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            remove(data);
                                        }
                                    },
                                    m.trust(removeIcon)
                                ),
                                schema.preview ?
                                    m("a", {
                                            class  : css.preview,
                                            title  : `Preview: ${itemName}`,
                                            href   : `${schema.preview}${data.key}`,
                                            target : "_blank",
                                            onclick(e) {
                                                // to prevent navigating to CMS entry
                                                e.stopPropagation();
                                            }
                                        },
                                        m.trust(previewIcon)
                                    ) :
                                    null
                            )
                        )
                    );
                })
            )
        );
    }
};
