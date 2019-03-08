import m from "mithril";

import config from "../../config";
import prefix from "../../lib/prefix";

import invalidMsg from "./invalid-msg.js";
import scheduleBox from "./schedule-box.js";

import css from "./head.css";

import arrowIcon from "../../icons/arrow.svg";
import saveIcon from "../../icons/save.svg";
import publishIcon from "../../icons/publish.svg";
import scheduleIcon from "../../icons/schedule.svg";
import removeIcon from "../../icons/remove.svg";

export default {
    view(vnode) {
        const { content } = vnode.attrs;
        const schedule = content.schedule;
        const state    = content.get();
        const locked   = config.locked;

        return m("div", { class : css.contentHd },
            m("div", { class : css.main },

                // Controls
                m("div", { class : css.actions }, [
                    m("a", {
                            class    : css.back,
                            title    : "Back to Listing",
                            href     : prefix(`/${state.schema.key}`),
                            oncreate : m.route.link
                        },
                        m.trust(arrowIcon),
                        "Back"
                    ),

                    m("button", {
                            class    : css.save,
                            title    : "Save your changes",
                            disabled : locked || !state.meta.dirty || null,

                            onclick() {
                                if (state.ui.saving) {
                                    return;
                                }

                                content.save();
                            }
                        },
                        m.trust(saveIcon),
                        state.ui.saving ? "SAVING..." : "Save"
                    )
                ]),

                m("div", { class : css.publishing },
                    // Schedule
                    m("button", {
                            class : state.dates.validSchedule ? css.schedule : css.scheduleInvalid,
                            title : "Schedule a publish",

                            onclick() {
                                content.toggleSchedule();
                            }
                        },
                        m.trust(scheduleIcon)
                    ),

                    m("div", { class : css.publishContainer },
                        m("button", {
                                class    : css.publish,
                                title    : (state.meta.status === "published") ? "Already Published" : "",
                                disabled : locked || null,

                                onclick() {
                                    schedule.publish();
                                }
                            },
                            m.trust(publishIcon),
                            "Publish"
                        ),
                        state.form ?
                            m(invalidMsg, { content : content }) :
                            null
                    ),

                    m("button", {
                            class    : css.unpublish,
                            disabled : locked || null,

                            onclick() {
                                schedule.unpublish();
                            }
                        },
                        m.trust(removeIcon),
                        "Unpublish"
                    )
                ),

                // Schedule Pop Up
                state.ui.schedule ?
                    m(scheduleBox, vnode.attrs) :
                    null
            )
        );
    }
};
