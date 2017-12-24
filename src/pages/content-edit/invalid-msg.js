import m from "mithril";

import css from "./invalid-msg.css";

// A mosly-dumb controller is required here so we can retain some state 
// information about this transitioning element. Mithril makes it pretty
// tricky to do this sort of a transition over time or after a delay.

export function oninit(vnode) {
    var content = vnode.attrs.content;

    vnode.state.invalidMessages = [];
    vnode.state.wasInvalid = false;
    vnode.state.transitioning = false;

    vnode.state.updateState = function(state) {
        // We need to retain our own copy of the invalid fields,
        // because they get cleared out from state very quickly.
        vnode.state.invalidMessages = state.form.invalidMessages;
        vnode.state.wasInvalid = state.ui.invalid;
        vnode.state.transitioning = true;
    };

    vnode.state.reset = function() {
        content.validity.reset();

        vnode.state.invalidMessages = [];
        vnode.state.wasInvalid = false;
        vnode.state.transitioning = false;
    };
}

export function view(vnode) {
    var content = vnode.attrs.content,
        state   = content.get(),
        invalid = state.ui.invalid;

    if(!invalid && !vnode.state.transitioning) {
        return m("div", { style : "display:none;" });
    }

    if(invalid && !vnode.state.wasInvalid) {
        vnode.state.updateState(state);
    }

    return m("div", {
            class : invalid ? css.visible : css.delayedHide,

            config : function(el, isInit) {
                if(isInit) {
                    return;
                }

                vnode.state.transitioning = true;
                content.toggleInvalid(false);

                el.addEventListener("transitionend", function(evt) {
                    vnode.state.reset();
                    m.redraw();
                });
            }
        },
        "The form cannot be saved.",
        m("ul",
            vnode.state.invalidMessages.map(function(name) {
                return m("li", name);
            })
        ),
        m("button", {
                class : css.closeInvalidMessage,

                onclick : function() {
                    vnode.state.reset();
                    content.validity.reset();
                }
            },
            "x" // todo, figure out how to use a unicode x here
        )
    );
}
