import m from "mithril";
import formatDate from "date-fns/format";

import css from "./head.css";

const DEFAULT_START_TIME = "00:00";
const DEFAULT_END_TIME   = "23:59";

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";

const TIMESTAMP_FORMAT   = "x";

function scheduleStr(side, date, time) {
    if (!date) {
        return null;
    }

    if (!time) {
        time = side === "start" ? DEFAULT_START_TIME : DEFAULT_END_TIME;
    }

    return `${date} ${time}`;
}

function timestampFromStr(str) {
    return parseInt(formatDate(str, TIMESTAMP_FORMAT), 10);
}

function timestamp(side, date, time) {
    const str = scheduleStr(side, date, time);

    return str ? timestampFromStr(str) : null;
}

// All data in and out of the `scheduler` is in the form of timestamps.
// All transformations to and from the date+time input fields will be
// handled by this controller.

const scheduleInput = {
    view(vnode) {
        const { id, inputs, onchange, side, part, ctx } = vnode.attrs;

        return m("input", {
            id,
            type  : part,
            class : inputs.valid ? css.date : css.invalidDate,
            value : inputs[side][part],

            oninput : m.withAttr("value", (value) => {
                onchange.call(ctx, side, part, value);
            })
        });
    }
};

export default {
    oninit(vnode) {
        vnode.state.content = vnode.attrs.content;

        vnode.state.inputs = null;
        vnode.state.ts     = null;

        // Init
        vnode.state.makeSchedule();
    },

    makeSchedule() {
        const dates = this.content.get().dates;
        const pub   = dates.published_at;
        const unpub = dates.unpublished_at;

        this.inputs = {
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
    },

    onchange(side, part, val) {
        const { inputs, content } = this;

        let dateField,
            ts;

        function determineTimestamps() {
            this.ts = {
                published_at   : timestamp("start", inputs.start.date, inputs.start.time),
                unpublished_at : timestamp("end",   inputs.end.date,   inputs.end.time)
            };
        }

        dateField = side === "start" ? "published" : "unpublished";
        inputs[side][part] = val;

        determineTimestamps.call(this);
        ts = this.ts[`${dateField}_at`];

        content.schedule.setDateField(dateField, ts);
    },

    view(vnode) {
        const { inputs, onchange } = vnode.state;
        const schedule = vnode.state.content.schedule;

        // Update schedule on redraw.
        vnode.state.makeSchedule();

        return m("div", { class : css.details },
            m("div", { class : css.start },
                m("p", m("label", { for : "published_at_date" }, "Publish at")),

                m("p", m(scheduleInput, { inputs, onchange, id : "published_at_date", side : "start", part : "date", ctx : vnode.state })),
                m("p", m(scheduleInput, { inputs, onchange, id : "published_at_time", side : "start", part : "time", ctx : vnode.state }))
            ),
            m("div", { class : css.end },
                m("p", m("label", { for : "unpublished_at_date" }, "Until (optional)")),

                m("p", m(scheduleInput, { inputs, onchange, id : "unpublished_at_date", side : "end", part : "date", ctx : vnode.state })),
                m("p", m(scheduleInput, { inputs, onchange, id : "unpublished_at_time", side : "end", part : "time", ctx : vnode.state })),
                m("p",
                    m("button", {
                            class : css.clearSchedule,
                            title : "Clear schedule dates",

                            onclick() {
                                schedule.clearSchedule();
                            }
                        },
                        "clear schedule"
                    )
                )
            )
        );
    }
};
