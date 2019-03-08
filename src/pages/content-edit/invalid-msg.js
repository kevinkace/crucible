import m from "mithril";

import css from "./invalid-msg.css";

// A mostly-dumb controller is required here so we can retain some state
// information about this transitioning element. Mithril makes it pretty
// tricky to do this sort of a transition over time or after a delay.

export default {
    oninit(vnode) {
        vnode.state.invalidMessages = [];
        vnode.state.wasInvalid = false;
        vnode.state.transitioning = false;
    },

    updateState(state) {
        // We need to retain our own copy of the invalid fields,
        // because they get cleared out from state very quickly.
        this.invalidMessages = state.form.invalidMessages;
        this.wasInvalid = state.ui.invalid;
        this.transitioning = true;
    },

    reset() {
        this.content.validity.reset();

        this.invalidMessages = [];
        this.wasInvalid = false;
        this.transitioning = false;
    },

    view(vnode) {
        const { transitioning, wasInvalid, invalidMessages } = vnode.state;
        const { content } = vnode.attrs;
        const state   = content.get();
        const invalid = state.ui.invalid;

        if (!invalid && !transitioning) {
            return m("div", { style : "display:none;" });
        }

        if (invalid && !wasInvalid) {
            vnode.state.updateState(state);
        }

        return m("div", {
                class : invalid ? css.visible : css.delayedHide,

                oncreate({ dom }) {
                    vnode.state.transitioning = true;
                    content.toggleInvalid(false);

                    dom.addEventListener("transitionend", () => {
                        vnode.state.reset();
                        m.redraw();
                    });
                }
            },
            "The form cannot be saved.",
            m("ul",
                invalidMessages.map(name => m("li", name))
            ),
            m("button", {
                    class : css.closeInvalidMessage,

                    onclick() {
                        vnode.state.reset();
                        content.validity.reset();
                    }
                },
                "x" // todo, figure out how to use a unicode x here
            )
        );
    }
};
