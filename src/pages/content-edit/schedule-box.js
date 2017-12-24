import m from "mithril";
import formatDate from "date-fns/format";

import css from "./head.css";

var DEFAULT_START_TIME = "00:00",
    DEFAULT_END_TIME   = "23:59",

    DATE_FORMAT = "YYYY-MM-DD",
    TIME_FORMAT = "HH:mm",

    TIMESTAMP_FORMAT   = "x";

function scheduleStr(side, date, time) {
    if(!date) {
        return null;
    }

    if(!time) {
        time = side === "start" ? DEFAULT_START_TIME : DEFAULT_END_TIME;
    }

    return date + " " + time;
}

function timestampFromStr(str) {
    return parseInt(formatDate(str, TIMESTAMP_FORMAT), 10);
}

function timestamp(side, date, time) {
    var str = scheduleStr(side, date, time);

    return str ? timestampFromStr(str) : null;
}

// All data in and out of the `scheduler` is in the form of timestamps.
// All transformations to and from the date+time input fields will be
// handled by this controller.

export function oninit(vnode) {
    vnode.state.content = vnode.attrs.content;

    vnode.state.inputs = null;
    vnode.state.ts     = null;

    vnode.state.makeSchedule = function() {
        var dates = vnode.state.content.get().dates,
            pub   = dates.published_at,
            unpub = dates.unpublished_at;

        vnode.state.inputs = {
            valid : dates.validSchedule,

            start : {
                date : pub ? formatDate(pub, DATE_FORMAT) : "",
                time : pub ? formatDate(pub, TIME_FORMAT) : DEFAULT_START_TIME
            },

            end : {
                date : unpub ? formatDate(unpub, DATE_FORMAT) : "",
                time : unpub ? formatDate(unpub, TIME_FORMAT) : DEFAULT_END_TIME
            }
        };
    };

    function determineTimestamps() {
        vnode.state.ts = {
            published_at   : timestamp("start", vnode.state.inputs.start.date, vnode.state.inputs.start.time),
            unpublished_at : timestamp("end",   vnode.state.inputs.end.date,   vnode.state.inputs.end.time)
        };
    }

    vnode.state.onChange = function(side, part, val) {
        var dateField,
            ts;

        dateField = side === "start" ? "published" : "unpublished";
        vnode.state.inputs[side][part] = val;

        determineTimestamps();
        ts = vnode.state.ts[dateField + "_at"];

        vnode.state.content.schedule.setDateField(dateField, ts);
    };

    // Init
    vnode.state.makeSchedule();
}

function mScheduleInput(state, id, side, part) {
    return m("input", {
        id    : id,
        type  : part,
        class : state.inputs.valid ? css.date : css.invalidDate,
        value : state.inputs[side][part],

        // Events
        oninput : m.withAttr("value", state.onChange.bind(state, side, part))
    });
}

export function view(vnode) {
    var schedule = vnode.state.content.schedule;

    // Update schedule on redraw.
    vnode.state.makeSchedule();

    return m("div", { class : css.details },
        m("div", { class : css.start },
            m("p", m("label", { for : "published_at_date" }, "Publish at")),

            m("p", mScheduleInput(vnode.state, "published_at_date", "start", "date")),
            m("p", mScheduleInput(vnode.state, "published_at_time", "start", "time"))
        ),
        m("div", { class : css.end },
            m("p", m("label", { for : "unpublished_at_date" }, "Until (optional)")),

            m("p", mScheduleInput(vnode.state, "unpublished_at_date", "end", "date")),
            m("p", mScheduleInput(vnode.state, "unpublished_at_time", "end", "time")),
            m("p",
                m("button", {
                        class : css.clearSchedule,
                        title : "Clear schedule dates",

                        // Events
                        onclick : schedule.clearSchedule.bind(schedule)
                    },
                    "clear schedule"
                )
            )
        )
    );
}
