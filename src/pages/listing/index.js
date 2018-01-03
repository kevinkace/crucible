import m from "mithril";
import format from "date-fns/format";
import fuzzy from "fuzzysearch";
import debounce from "lodash.debounce";
import get from "lodash.get";
import slug from "sluggo";

import config from "../../config.js";

import db from "../../lib/firebase.js";
import prefix from "../../lib/prefix.js";
import getItemStatus from "../../lib/item-status.js";

import * as layout from "../layout/index.js";

import name from "../content-edit/name.js";

import removeIcon from "../../icons/remove.svg";
import previewIcon from "../../icons/preview.svg";

import PageState from "./page-state.js";
import css from "./listing.css";

var DB_ORDER_BY = "updated_at",
    INITIAL_SEARCH_CHUNK_SIZE = 100,
    SEARCH_MODE_RECENT = "recent",
    SEARCH_MODE_ALL = "all",
    dateFormat = "MM/DD/YYYY",
    orderOpts = {
        updated     : { label : "Updated",     value : "updated_at" },
        created     : { label : "Created",     value : "created_at" },
        published   : { label : "Published",   value : "published_at" },
        unpublished : { label : "Unpublished", value : "unpublished_at" }
    };

function contentFromRecord(record, orderBy) {
    var data = record.val();

    data.key          = record.key();
    data.published_at = data.published_at;
    data.order_by     = data[orderBy.value];
    data.search       = slug(data.name, { separator : "" });

    return data;
}

function contentFromSnapshot(snap, orderBy, removeOverflow) {
    var content = [];

    snap.forEach(function(record) {
        var item = contentFromRecord(record, orderBy);

        content.push(item);
    });

    if(removeOverflow) {
        content.splice(0, 1);
    }

    return content;
}

export function oninit(vnode) {
    var defaultSort = orderOpts.updated,
        orderByKey,
        schema;

    vnode.state.schema  = null;
    vnode.state.content = null;
    vnode.state.results = null;

    vnode.state.contentLoc = null;
    vnode.state.queryRef   = null;

    vnode.state.searchInput = null;
    vnode.state.searchMode  = SEARCH_MODE_RECENT;

    vnode.state.orderBy = null;
    vnode.state.doOrderBlink = false;
    vnode.state.loading = true;

    // We need to check for an "overflowItem" to peek at
    // the next page's first item. This lets us grab the
    // next page's timestamp limit, or find we're on the last page.
    function onNext(snap) {
        var snapVal = snap.val(),
            recordCt    = Object.keys(snapVal || {}).length,
            isLastPage  = recordCt <= vnode.state.pg.itemsPer,
            hasOverflow = !isLastPage && recordCt === vnode.state.pg.itemsPer + 1,

            oldestTs = Number.MAX_SAFE_INTEGER,
            content  = [],
            overflow;

        if(!snapVal) {
            vnode.state.loading = false;

            return;
        }

        snap.forEach(function(record) {
            var item = contentFromRecord(record, vnode.state.orderBy);

            oldestTs = (item.order_by < oldestTs) ? item.order_by : oldestTs;
            content.push(item);
        });

        overflow = (hasOverflow) ? content.splice(0, 1)[0] : null;
        vnode.state.content = content;

        if(!isLastPage && overflow) {
            vnode.state.pg.limits.push(oldestTs);
        }
    }

    // When we go backward, or return to a page we've already
    // loaded, there's very little work to be done.
    function onPageReturn(snap) {
        vnode.state.content = contentFromSnapshot(snap, vnode.state.orderBy, true);
    }

    function onValue(snap) {
        var wentPrev = Boolean(vnode.state.pg.nextPageTs());

        if(wentPrev) {
            onPageReturn.call(this, snap);
        } else {
            onNext.call(this, snap);
        }

        vnode.state.loading = false;

        m.redraw();
    }

    vnode.state.setItemsPer = function(val) {
        var num = parseInt(val, 10);

        if(isNaN(num)) {
            return;
        }

        vnode.state.pg.setItemsPer(num);
        vnode.state.showPage();
    };

    vnode.state.nextPage = function() {
        vnode.state.pg.next();
        vnode.state.showPage();
    };

    vnode.state.prevPage = function() {
        vnode.state.pg.prev();
        vnode.state.showPage();
    };

    vnode.state.showPage = function() {
        var overflowItem = 1,
            pageTs = vnode.state.pg.currPageTs(),
            nextTs = vnode.state.pg.nextPageTs();

        if(vnode.state.queryRef) {
            vnode.state.queryRef.off();
        }

        if(nextTs) {
            // This is safer in the case that firebase updates
            // because of another user's acitvity.
            vnode.state.queryRef = vnode.state.contentLoc
                .orderByChild(vnode.state.orderBy.value)
                .startAt(nextTs)
                .endAt(pageTs);

            vnode.state.queryRef.on("value", onValue);

            return;
        }

        // Firebase orders Ascending, so the
        // lowest/oldest entry will be first in the snapshot.
        // We want items in descneding, so we slice our
        // query from the other end via .endAt/.limitToLast
        vnode.state.queryRef = vnode.state.contentLoc
            .orderByChild(vnode.state.orderBy.value)
            .endAt(vnode.state.pg.limits[vnode.state.pg.page])
            .limitToLast(vnode.state.pg.itemsPer + overflowItem);

        vnode.state.queryRef.on("value", onValue);
    };

    vnode.state.setOrderBy = function(optKey) {
        vnode.state.orderBy = orderOpts[optKey];
        window.localStorage.setItem("crucible:orderBy", optKey);

        vnode.state.pg = new PageState();
        vnode.state.doOrderBlink = true;
        vnode.state.showPage();
    };


    // Event handlers
    vnode.state.add = function() {
        var result;

        result = db.child("content/" + vnode.state.schema.key).push({
            created_at : db.TIMESTAMP,
            created_by : db.getAuth().uid
        });

        m.route.set(prefix("/content/" + vnode.state.schema.key + "/" + result.key()));
    };

    vnode.state.remove = function(data, e) {
        var ref;

        e.stopPropagation();

        ref = db.child("content")
            .child(vnode.state.schema.key)
            .child(data.key);

        ref.off(); // Ensure we don't have lingering listeners.

        if(window.confirm("Remove " + data.name + "?")) {
            ref.remove().catch(console.error.bind(console));
        }
    };

    vnode.state.change = function(page, e) {
        e.preventDefault();

        vnode.state.page = page;
    };


    // m.redraw calls are necessary due to debouncing, this function
    // may not be executing during a planned redraw cycle
    function onSearchResults(searchStr, snap) {
        var contents = contentFromSnapshot(snap, vnode.state.orderBy);

        vnode.state.results = contents.filter(function(content) {
            return fuzzy(searchStr, content.search);
        });

        return m.redraw();
    }

    vnode.state.searchFor = debounce(function(input) {
        vnode.state.searchMode = SEARCH_MODE_RECENT;

        if(input.length < 2) {
            vnode.state.results = false;

            return m.redraw();
        }

        input = slug(input);
        vnode.state.getSearchResults(input);

        return null;
    }, 800);


    vnode.state.getSearchResults = function(searchStr) {
        if(vnode.state.queryRef) {
            vnode.state.queryRef.off();
        }

        vnode.state.queryRef = vnode.state.contentLoc
            .orderByChild(orderOpts.updated.value)
            .endAt(Number.MAX_SAFE_INTEGER)
            .limitToLast(INITIAL_SEARCH_CHUNK_SIZE);

        vnode.state.queryRef.on("value", onSearchResults.bind(vnode.state, searchStr));
    };

    vnode.state.searchAll = function() {
        var searchStr = vnode.state.searchInput && vnode.state.searchInput.value;

        if(!searchStr) {
            return; // Not ready
        }

        vnode.state.searchMode = SEARCH_MODE_ALL;

        if(vnode.state.queryRef) {
            vnode.state.queryRef.off();
        }

        vnode.state.queryRef = vnode.state.contentLoc
            .orderByChild(DB_ORDER_BY);

        vnode.state.queryRef.on("value", onSearchResults.bind(vnode.state, searchStr));
    };


    vnode.state.clearSearch = function() {
        if(vnode.state.searchInput) {
            vnode.state.searchInput.value = "";
            vnode.state.results = null;
            vnode.state.pg.first();
            vnode.state.showPage();
        }
    };


    // Go get initial data
    vnode.state.pg = new PageState();

    // Check previous order preference
    if(window.localStorage) {
        orderByKey = window.localStorage.getItem("crucible:orderBy");
        vnode.state.orderBy = orderOpts[orderByKey];
    }

    // or use default order
    if(!vnode.state.orderBy) {
        vnode.state.orderBy = defaultSort;
    }

    db.child("schemas/" + m.route.param("schema")).on("value", function onSchema(snap) {
        if(!snap.exists()) {
            console.error("Error retrieving schema snapshot from Firebase.");

            vnode.state.loading = false;

            return;
        }

        vnode.state.schema = snap.val();
        vnode.state.schema.key = snap.key();
        vnode.state.contentLoc = db.child("content/" + vnode.state.schema.key);

        vnode.state.showPage();
    });
}

// export function onbeforeupdate(vnode) {

// }

// export { oninit as onbeforeupdate };

export function view(vnode) {
    var content = vnode.state.results || vnode.state.content || [],
        locked  = config.locked,
        isSearchResults = Boolean(vnode.state.results),
        hasMoreResults = (content.length >= INITIAL_SEARCH_CHUNK_SIZE),
        searchContents;

    if(!m.route.param("schema")) {
        m.route.set("/");
    }

    return m(layout, {
        title   : get(vnode.state, "schema.name") || "...",
        loading : vnode.state.loading,
        content : [
            m("div", { class : layout.css.content },
                m("div", { class : css.contentHd },
                    m("button", {
                            onclick  : vnode.state.add,
                            class    : css.add,
                            disabled : locked || null
                        },
                        "+ Add " + (vnode.state.schema && vnode.state.schema.name || "...")
                    ),
                    vnode.state.schema && vnode.state.schema.key ?
                        m("a", {
                            href     : "/listing/" + vnode.state.schema.key + "/edit",
                            oncreate : m.route.link,
                            class    : css.edit
                        }, "Edit Schema") :
                        null
                ),
                m("div", { class : css.contentBd }, [
                    m("div", { class : css.metas },
                        m("div", { class : css.search }, [
                            m("input", {
                                class       : css.searchInput,
                                placeholder : "Search...",
                                oninput     : m.withAttr("value", vnode.state.searchFor),

                                oncreate : function(searchVnode) {
                                    vnode.state.searchInput = searchVnode.dom;
                                }
                            }),
                            vnode.state.searchInput && vnode.state.searchInput.value ?
                                m("button", {
                                    class   : css.searchClear,
                                    onclick : vnode.state.clearSearch.bind(vnode.state)
                                }, "") :
                                null
                        ]),
                        m("div", { class : css.manage },
                            m("span", { class : css.itemsPerLabel }, "Items Per Page: "),
                            m("input", {
                                class : css.itemsPer,
                                type  : "number",
                                value : vnode.state.pg.itemsPer,

                                disabled : isSearchResults,

                                onchange : m.withAttr("value", vnode.state.setItemsPer)
                            })
                        ),

                        isSearchResults ?
                            m("div", { class : css.showingResults },
                                vnode.state.searchMode === SEARCH_MODE_ALL ?
                                    "Showing all results" : null,
                                hasMoreResults ?
                                    [
                                        "Showing most recent " + INITIAL_SEARCH_CHUNK_SIZE + " items... ",
                                        m("button", {
                                                onclick : vnode.state.searchAll.bind(vnode.state),
                                                class   : css.nextPageF
                                            },
                                            "Search All"
                                        )
                                    ] :
                                    null
                            ) :
                            m("div", { class : css.pages }, [
                                m("button", {
                                        onclick  : vnode.state.prevPage.bind(vnode.state),
                                        class    : css.prevPage,
                                        disabled : locked || vnode.state.pg.page === 1 || null
                                    },
                                    "\< Prev Page"
                                ),
                                m("span", {
                                        class : css.currPage
                                    },
                                    isSearchResults ? "-" : vnode.state.pg.page
                                ),
                                m("button", {
                                        onclick  : vnode.state.nextPage.bind(vnode.state),
                                        class    : css.nextPage,
                                        disabled : locked || vnode.state.pg.page === vnode.state.pg.numPages() || null
                                    },
                                    "Next Page \>"
                                )
                            ]),

                        m("div", { class : css.sort },
                            "Sort Items By: ",

                            m("select", {
                                    class    : css.sortSelect,
                                    onchange : m.withAttr("value", vnode.state.setOrderBy.bind(vnode.state))
                                },
                                Object.keys(orderOpts).map(function(key) {
                                    var selected = vnode.state.orderBy.value === orderOpts[key].value;

                                    return m("option", { value : key, selected : selected }, orderOpts[key].label);
                                })
                            )
                        )
                    ),
                    m("div", { class : css.entriesContainer },
                        m("table", { class : css.table },
                            m("thead", { class : css.tableHeader },
                                m("tr",
                                    m("th", { class : css.headerName }, "Name"),
                                    m("th", { class : css.headerStatus }, "Status"),
                                    m("th", { class : css.headerScheduled }, "Scheduled"),
                                    m("th", {
                                            class : css.headerOrderedBy,

                                            // todo: what does this do?
                                            onbeforeupdate : function(thVnode) {
                                                if(!thVnode.dom) {
                                                    return;
                                                }

                                                if(thVnode.classList.contains(css.blink)) {
                                                    thVnode.classList.remove(css.blink);
                                                    m.redraw();
                                                } else if(vnode.state.doOrderBlink) {
                                                    vnode.state.doOrderBlink = false;
                                                    thVnode.classList.add(css.blink);
                                                    m.redraw();
                                                }
                                            }
                                        }, vnode.state.orderBy.label),
                                    m("th", { class : css.headerActions }, "Actions")
                                )
                            ),
                            m("tbody",
                                content
                                .sort(function(a, b) {
                                    return b.order_by - a.order_by;
                                })
                                .map(function(data) {
                                    var itemNameStatus = css.itemName,
                                        now = Date.now(),
                                        orderBy = vnode.state.orderBy.value,

                                        itemName,
                                        itemStatus,

                                        itemOrderedBy,
                                        itemSchedule;

                                    if(data.published_at) {
                                        itemNameStatus = css.itemNamePublished;
                                    }

                                    if(data.published_at > now) {
                                        itemNameStatus = css.itemNameScheduled;
                                    }

                                    if(data.unpublished_at < now) {
                                        itemNameStatus = css.itemNameUnpublished;
                                    }

                                    itemStatus = getItemStatus(data);

                                    itemName = name(vnode.state.schema, data);

                                    itemOrderedBy = data[orderBy] ?
                                        format(data[orderBy], dateFormat) : "--/--/----";

                                    itemSchedule = data.published_at ?
                                        format(data.published_at, dateFormat) : "--/--/----";

                                    return m("tr", {
                                            class   : css.row,
                                            onclick : function() {
                                                m.route.set(prefix("/content/" + vnode.state.schema.key + "/" + data.key));
                                            }
                                        },
                                        m("td", {
                                                class : itemNameStatus,
                                                title : itemName
                                            },
                                            itemName
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
                                                        title    : "Remove: " + itemName,
                                                        disabled : locked || null,
                                                        onclick  : vnode.state.remove.bind(vnode.state, data)
                                                    },
                                                    m.trust(removeIcon)
                                                ),
                                                vnode.state.schema.preview ?
                                                    m("a", {
                                                            class  : css.preview,
                                                            title  : "Preview: " + itemName,
                                                            href   : vnode.state.schema.preview + data.key,
                                                            target : "_blank"
                                                        },
                                                        m.trust(previewIcon)
                                                    ) :
                                                    null
                                            )
                                        )
                                    );
                                })
                            )
                        )
                    )
                ])
            )
        ]
    });
}

