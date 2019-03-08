import m from "mithril";
import fuzzy from "fuzzysearch";
import debounce from "lodash.debounce";
import get from "lodash.get";
import slug from "sluggo";

import config from "../../config.js";

import db from "../../lib/firebase.js";
import prefix from "../../lib/prefix.js";

import table from "./table";
import layout, { layoutCss } from "../layout/index.js";

import PageState from "./page-state.js";
import css from "./listing.css";

const DB_ORDER_BY = "updated_at";
const INITIAL_SEARCH_CHUNK_SIZE = 100;
const SEARCH_MODE_RECENT = "recent";
const SEARCH_MODE_ALL = "all";
const orderOpts = {
        updated     : { label : "Updated",     value : "updated_at" },
        created     : { label : "Created",     value : "created_at" },
        published   : { label : "Published",   value : "published_at" },
        unpublished : { label : "Unpublished", value : "unpublished_at" }
    };

function contentFromRecord(record, orderBy) {
    const data = record.val();

    data.key          = record.key();
    data.published_at = data.published_at;
    data.order_by     = data[orderBy.value];
    data.search       = slug(data.name, { separator : "" });

    return data;
}

function contentFromSnapshot(snap, orderBy, removeOverflow) {
    const content = [];

    snap.forEach(record => {
        const item = contentFromRecord(record, orderBy);

        content.push(item);
    });

    if (removeOverflow) {
        content.splice(0, 1);
    }

    return content;
}

export default {
    oninit(vnode) {
        vnode.state.defaultSort = orderOpts.updated;

        vnode.state.schemaRef = null;
        vnode.state.schema  = null;
        vnode.state.content = [];
        vnode.state.results = null;

        vnode.state.contentLoc = null;
        vnode.state.queryRef   = null;

        vnode.state.searchInput = null;
        vnode.state.searchMode  = SEARCH_MODE_RECENT;

        vnode.state.orderBy      = null;
        vnode.state.doOrderBlink = false;
        vnode.state.loading      = true;
        vnode.state.dirty        = true;

        vnode.state.searchFor = debounce(input => {
            vnode.state.searchMode = SEARCH_MODE_RECENT;

            if (input.length < 2) {
                this.results = false;

                return m.redraw();
            }

            input = slug(input);
            vnode.state.getSearchResults(input);

            return null;
        }, 800);


        vnode.state.init();
    },

    onbeforeupdate(vnode) {
        if (vnode.state.schema.key !== m.route.param("schema")) {
            vnode.state.init();

            return true;
        }

        if (vnode.state.dirty) {
            vnode.state.dirty = false;

            return true;
        }

        return false;
    },

    // Go get initial data
    init() {
        this.pg = new PageState();

        if (window.localStorage) {
            this.orderByKey = window.localStorage.getItem("crucible:orderBy");
            this.orderBy = orderOpts[this.orderByKey];
        }

        if (!this.orderBy) {
            this.orderBy = this.defaultSort;
        }

        this.content = [];
        this.loading   = true;
        this.schemaRef = db.child(`schemas/${m.route.param("schema")}`);
        this.schemaRef.on("value", (value) => {
            this.onSchema(value);
        });
    },

    // We need to check for an "overflowItem" to peek at
    // the next page's first item. This lets us grab the
    // next page's timestamp limit, or find we're on the last page.
    onNext(snap) {
        const snapVal     = snap.val();
        const recordCt    = Object.keys(snapVal || {}).length;
        const isLastPage  = recordCt <= this.pg.itemsPer;
        const hasOverflow = !isLastPage && (recordCt === this.pg.itemsPer + 1);
        const content     = [];

        let oldestTs = Number.MAX_SAFE_INTEGER,
            overflow;

        this.dirty = true;

        if (!snapVal) {
            this.loading = false;

            return;
        }

        snap.forEach(record => {
            const item = contentFromRecord(record, this.orderBy);

            oldestTs = (item.order_by < oldestTs) ? item.order_by : oldestTs;
            content.push(item);
        });

        overflow = hasOverflow ? content.splice(0, 1)[0] : null;
        this.content = content;

        if (!isLastPage && overflow) {
            this.pg.limits.push(oldestTs);
        }
    },

    // When we go backward, or return to a page we've already
    // loaded, there's very little work to be done.
    onPageReturn(snap) {
        this.content = contentFromSnapshot(snap, this.orderBy, true);
        this.dirty = true;
    },

    onValue(snap) {
        const wentPrev = Boolean(this.pg.nextPageTs());

        if (wentPrev) {
            this.onPageReturn(snap);
        } else {
            this.onNext(snap);
        }

        this.dirty   = true;
        this.loading = false;

        m.redraw();
    },

    onSchema(snap) {
        if (!snap.exists()) {
            console.error("Error retrieving schema snapshot from Firebase.");

            this.loading = false;

            return;
        }

        this.dirty      = true;
        this.schema     = snap.val();
        this.schema.key = snap.key();
        this.contentLoc = db.child(`content/${this.schema.key}`);

        this.showPage();
    },

    setItemsPer(val) {
        const num = parseInt(val, 10);

        if (isNaN(num)) {
            return;
        }

        this.pg.setItemsPer(num);
        this.showPage();
    },

    nextPage() {
        this.pg.next();
        this.showPage();
    },

    prevPage() {
        this.pg.prev();
        this.showPage();
    },

    showPage() {
        const overflowItem = 1;
        const pageTs = this.pg.currPageTs();
        const nextTs = this.pg.nextPageTs();

        if (this.queryRef) {
            this.queryRef.off();
        }

        if (nextTs) {
            // This is safer in the case that firebase updates
            // because of another user's activity.
            this.queryRef = this.contentLoc
                .orderByChild(this.orderBy.value)
                .startAt(nextTs)
                .endAt(pageTs);

            this.queryRef.on("value", this.onValue.bind(this));

            return;
        }

        // Firebase orders Ascending, so the
        // lowest/oldest entry will be first in the snapshot.
        // We want items in descending, so we slice our
        // query from the other end via .endAt/.limitToLast
        this.queryRef = this.contentLoc
            .orderByChild(this.orderBy.value)
            .endAt(this.pg.limits[this.pg.page])
            .limitToLast(this.pg.itemsPer + overflowItem);

        this.queryRef.on("value", this.onValue.bind(this));
    },

    setOrderBy(optKey) {
        this.orderBy = orderOpts[optKey];
        window.localStorage.setItem("crucible:orderBy", optKey);

        this.pg = new PageState();
        this.doOrderBlink = true;
        this.showPage();
    },

    resetBlink() {
        this.doOrderBlink = false;
    },

    add() {
        const result = db.child(`content/${this.schema.key}`).push({
            created_at : db.TIMESTAMP,
            created_by : db.getAuth().uid
        });

        m.route.set(prefix(`/${this.schema.key}/${result.key()}`));
    },

    remove(data) {
        const contentRef = db.child("content")
            .child(this.schema.key)
            .child(data.key);

        contentRef.off(); // Ensure we don't have lingering listeners.

        // eslint-disable-next-line no-alert
        if (window.confirm(`Remove ${data.name}?`)) {
            contentRef.remove().catch(console.error.bind(console));
        }
    },

    // todo: is this used???
    change(page, e) {
        e.preventDefault();

        this.page = page;
    },


    // m.redraw calls are necessary due to debouncing, this function
    // may not be executing during a planned redraw cycle
    onSearchResults(searchStr, snap) {
        const contents = contentFromSnapshot(snap, this.orderBy);

        this.dirty   = true;
        this.results = contents.filter(content => fuzzy(searchStr, content.search));

        return m.redraw();
    },

    registerSearchInput(el) {
        this.searchInput = el;
    },

    getSearchResults(searchStr) {
        const { queryRef, contentLoc } = this;

        if (queryRef) {
            queryRef.off();
        }

        this.queryRef = contentLoc
            .orderByChild(orderOpts.updated.value)
            .endAt(Number.MAX_SAFE_INTEGER)
            .limitToLast(INITIAL_SEARCH_CHUNK_SIZE);

        queryRef.on("value", this.onSearchResults.bind(this, searchStr));
    },

    searchAll() {
        const searchStr = get(this, "searchInput.value");

        if (!searchStr) {
            return; // Not ready
        }

        this.searchMode = SEARCH_MODE_ALL;

        if (this.queryRef) {
            this.queryRef.off();
        }

        this.queryRef = this.contentLoc
            .orderByChild(DB_ORDER_BY);

        this.queryRef.on("value", this.onSearchResults.bind(this, searchStr));
    },

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = "";
            this.results = null;
            this.pg.first();
            this.showPage();
        }
    },

    view(vnode) {
        const content = vnode.state.results || vnode.state.content || [];
        const locked  = config.locked;
        const isSearchResults = Boolean(vnode.state.results);

        const {
            doOrderBlink, resetOrderBlink, orderBy,
            schema, remove, pg,
            loading, searchInput, searchMode
        } = vnode.state;

        const schemaName = schema && schema.name;
        const schemaKey  = schema && schema.key;
        const searchInputValue = searchInput && searchInput.value;

        if (!m.route.param("schema")) {
            m.route.set("/");
        }

        return m(layout, { title : schemaName || "...", loading },
            m("div", { class : layoutCss.content },
                m("div", { class : css.contentHd },
                    m("button", {
                            class    : css.add,
                            disabled : locked || null,
                            onclick() {
                                vnode.state.add();
                            }
                        },
                        `+ Add ${schemaName || "..."}`
                    ),
                    schemaKey ?
                        m("a", {
                                href     : prefix(`/${schemaKey}/edit`),
                                class    : css.edit,
                                oncreate : m.route.link
                            },
                            "Edit Schema"
                        ) :
                        null
                ),
                m("div", { class : css.contentBd }, [
                    m("div", { class : css.metas },
                        m("div", { class : css.search },
                            m("input", {
                                class       : css.searchInput,
                                placeholder : "Search...",
                                oninput     : m.withAttr("value", (value) => {
                                    vnode.state.searchFor(value);
                                }),

                                oncreate({ dom }) {
                                    vnode.state.registerSearchInput(dom);
                                }
                            }),
                            searchInputValue ?
                                m("button", {
                                    class : css.searchClear,
                                    onclick() {
                                        vnode.state.clearSearch();
                                    }
                                }, "") :
                                null
                        ),
                        m("div", { class : css.manage },
                            m("span", { class : css.itemsPerLabel }, "Items Per Page: "),
                            m("input", {
                                class : css.itemsPer,
                                type  : "number",
                                value : pg.itemsPer,

                                disabled : isSearchResults,

                                onchange : m.withAttr("value", (value) => {
                                    vnode.state.setItemsPer(value);
                                })
                            })
                        ),
                        // todo: change to component?
                        (function() {
                            const hasMoreResults = (content.length >= INITIAL_SEARCH_CHUNK_SIZE);

                            let searchContents;

                            if (isSearchResults) {
                                if (searchMode === SEARCH_MODE_ALL) {
                                    searchContents = "Showing all results.";
                                } else if (hasMoreResults) {
                                    searchContents = [
                                        `Showing most recent ${INITIAL_SEARCH_CHUNK_SIZE} items... `,
                                        m("button", {
                                                class : css.nextPageF,
                                                onclick() {
                                                    vnode.state.searchAll();
                                                },
                                            },
                                            "Search All"
                                        )
                                    ];
                                }

                                return m("div", { class : css.showingResults },
                                    searchContents
                                );
                            }

                            return m("div", { class : css.pages }, [
                                m("button", {
                                        class    : css.prevPage,
                                        disabled : locked || pg.page === 1 || null,

                                        onclick() {
                                            vnode.state.prevPage();
                                        },
                                    },
                                    "\< Prev Page"
                                ),
                                m("span", {
                                        class : css.currPage
                                    },
                                    isSearchResults ? "-" : pg.page
                                ),
                                m("button", {
                                        class    : css.nextPage,
                                        disabled : locked || pg.page === pg.numPages() || null,

                                        onclick() {
                                            vnode.state.nextPage();
                                        },
                                    },
                                    "Next Page \>"
                                )
                            ]);
                        }()),
                        m("div", { class : css.sort },
                            "Sort Items By: ",

                            m("select", {
                                    class    : css.sortSelect,
                                    onchange : m.withAttr("value", (value) => {
                                        vnode.state.setOrderBy(value);
                                    })
                                },
                                Object.keys(orderOpts).map(key => {
                                    const selected = orderBy.value === orderOpts[key].value;

                                    return m("option", { value : key, selected }, orderOpts[key].label);
                                })
                            )
                        )
                    ),
                    m("div", { class : css.entriesContainer },
                        m(table, {
                            remove : remove.bind(vnode.state),
                            doOrderBlink, resetOrderBlink,
                            orderBy, content, schema, locked
                        })
                    )
                ])
            )
        );
    }
};
