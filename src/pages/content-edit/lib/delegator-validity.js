import m from "mithril";
import debounce from "lodash.debounce";

import name from "../name.js";

import css from "../invalid-msg.css";

function reqPrefix(_name) {
    return `Required: ${_name}`;
}

export default function Validity(content) {
    this.handlersAttached = false;
    this.content = content;
}

Validity.prototype = {

    // Private functions.
    _show() {
        const wasInvalid = this.content.get().ui.invalid;

        this.content.toggleInvalid(true);
        if (!wasInvalid) {
            m.redraw(); // Only do once; avoid superfluous redraws.
        }
    },

    _hide() {
        // CSS transition does the rest.
        this.content.toggleInvalid(false);
        m.redraw();
    },

    // Public
    debounceFade() {
        const self = this;

        return debounce(
            self._hide.bind(self),
            100
        );
    },

    attachInputHandlers() {
        const self = this;
        const form = this.content.get().form.el;

        if (self.handlersAttached) {
            return;
        }

        self.handlersAttached = true;

        // Irritatingly, this attachment had to be delayed like this because the
        // form's `config` function was running before the whole DOM tree was rendered,
        // so we were getting an incomplete list of inputs previously.
        form.querySelectorAll("input, textarea, select").forEach(formInput => {
            formInput.addEventListener("invalid", e => {
                e.target.classList.add(css.highlightInvalid);
                self.registerInvalidField(e.target.name);
            });

            formInput.addEventListener("focus", e => {
                e.target.classList.remove(css.highlightInvalid);
                self.onFormFocus(e); // focus doesn't bubble, so we listen to all the inputs for this.
            });
        });
    },

    checkForm() {
        const state = this.content.get();

        this.attachInputHandlers();
        state.form.valid = state.form.el.checkValidity();

        return state.form.valid;
    },

    registerInvalidField(_name) {
        this.addInvalidField(_name);
        this._show();
        this.debounceFade();
    },

    addInvalidField(_name) {
        this.addInvalidMessage(reqPrefix(_name));
    },

    addInvalidMessage(msg) {
        const state = this.content.get();

        if (state.form.invalidMessages.indexOf(msg) > -1) {
            return;
        }

        state.form.invalidMessages.push(msg);
    },

    reset() {
        const state = this.content.get();

        state.form.valid = true;
        state.form.invalidMessages = [];
        this.content.toggleInvalid(false);
    },

    onFormFocus() {
        if (!this.content.get().form.valid) {
            this.debounceFade();
        }
    },

    checkSchedule() {
        const state = this.content.get();
        const pub   = state.dates.published_at;
        const unpub = state.dates.unpublished_at;

        let valid;

        valid = (!pub && !unpub) || // No schedule.
            (pub && !unpub)      || // Only have a pub date,
            (unpub && !pub)      || // Only have an unpub date.
            (pub && unpub && pub < unpub); // Have a valid pair of timestamps..

        state.dates.validSchedule = valid;
    },

    isValidSave() { // eslint-disable-line max-statements
        const STATUS  = this.content.schedule.STATUS;
        const state   = this.content.get();

        let isValid = true,
            requiresValid;

        if (state.meta.name === name(state.schema, {})) {
            // All saves must have a unique name.
            this.addInvalidMessage("Entry must have a title/name.");
            isValid = false;
        }

        this.content.schedule.updateStatus();

        requiresValid = [ STATUS.SCHEDULED, STATUS.PUBLISHED ].indexOf(state.meta.status) > -1;

        if (requiresValid) {
            this.checkForm();

            if (!state.form.valid) {
                this.addInvalidMessage("Cannot Publish with invalid or missing input.");
            }
        }

        this.checkSchedule();

        if (!state.dates.validSchedule) {
            isValid = false;
            this.addInvalidMessage("Invalid schedule.");
        }

        if (!state.form.valid || !isValid) {
            return false;
        }

        return true;
    }
};

