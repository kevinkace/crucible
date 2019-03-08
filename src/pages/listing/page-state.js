import clamp from "lodash.clamp";

const MIN_PAGE = 1;
const DEFAULT_ITEMS_PER = 15;
const INITIAL_LIMITS = [
        NaN, // Pad with a NaN so our indexes match page number
        Number.MAX_SAFE_INTEGER
    ];

function PageState(itemsPer) {
    this.limits = INITIAL_LIMITS.slice(); // copy
    this.page = 1;

    this.itemsPer = itemsPer;

    if (this.itemsPer) {
        return;
    }

    if (window.localStorage) {
        itemsPer = window.localStorage.getItem("crucible:itemsPer");
        itemsPer = parseInt(itemsPer, 10);

        if (!itemsPer) {
            itemsPer = DEFAULT_ITEMS_PER;
        }
    }

    this.setItemsPer(itemsPer);
}

PageState.prototype = {
    setItemsPer(newNum) {
        let setTo = newNum;

        if (typeof setTo !== "number") {
            setTo = parseInt(setTo, 10);

            if (isNaN(setTo)) {
                setTo = DEFAULT_ITEMS_PER;
            }
        }

        this.itemsPer = setTo;
        window.localStorage.setItem("crucible:itemsPer", setTo);
        this.reset();
    },

    reset() {
        this.limits = INITIAL_LIMITS.slice(); // copy
        this.page = 1;
    },

    numPages() {
        return this.limits.length - 1;
    },

    currPageTs() {
        return this.limits[this.page];
    },

    nextPageTs() {
        const nextIndex = this.page + 1;

        return this.limits.length > nextIndex ? this.limits[nextIndex] : null;
    },

    first() {
        this.page = MIN_PAGE;
    },

    next() {
        this.page = this.clampPage(++this.page);
    },

    prev() {
        this.page = this.clampPage(--this.page);
    },

    clampPage(pgNum) {
        return clamp(pgNum, MIN_PAGE, this.numPages());
    }
};

export default PageState;
