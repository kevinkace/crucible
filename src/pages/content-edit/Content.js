import m from "mithril";
import get from "lodash.get";
import set from "lodash.set";
import unset from "lodash.unset";
import merge from "lodash.merge";
import sluggo from "sluggo";

import db from "../../lib/firebase";
import * as snapshot from "./lib/transformer-snapshot.js";
import name from "./name.js";
import Hidden from "./lib/delegator-hidden.js";
import Schedule from "./lib/delegator-schedule.js";
import Validity from "./lib/delegator-validity.js";

function ContentState() {
    // These are 100% unnecessary, programmatically,
    // they are supposed to make the data object readable.
    const string  = null;
    const number  = null;
    const boolean = null;
    const formEl  = null;
    const object  = {};
    const array   = [];

    // A few values are set to defaults to avoid
    // UI jitter before firebase response.

    return {
        meta : {
            id     : string,
            name   : string,
            slug   : string,
            dirty  : boolean,
            status : "draft"
        },

        schema : object,

        ui : {
            saving   : boolean,
            schedule : boolean,
            invalid  : boolean
        },

        user : {
            created_by : string,
            updated_by : string,

            published_by   : string,
            unpublished_by : string
        },

        dates : {
            created_at : number,
            updated_at : number,

            published_at   : number,
            unpublished_at : number,
            validSchedule  : true
        },

        form : {
            el     : formEl,
            hidden : array,
            valid  : boolean,

            invalidMessages : array
        },

        fields : {}
    };
}


export default function Content() {
    this.state = new ContentState();
    this.user  = db.getAuth().uid;
    this.ref   = null; // Firebase object reference.

    this.hidden   = new Hidden(this);
    this.schedule = new Schedule(this);
    this.validity = new Validity(this);

    this.init();

    // temp
    window.content = this;
}

Content.prototype = {
    init() {
        this.validity.reset();
    },

    get(path) {
        if (!path) {
            return this.state;
        }

        return get(this.state, path);
    },

    // Setup
    setSchema(schema, key) {
        this.state.schema = schema;
        this.state.schema.key = key;

        if (!this.state.meta.name) {
            this.state.meta.name = name(schema, {});
        }
    },

    registerForm(formEl) {
        this.state.form.el = formEl;
    },

    mergeServerContent(data, ref) {
        this.ref = ref; // Firebase reference.

        this.state = merge(this.state, snapshot.toState(data));

        this.validity.checkSchedule();
        this.schedule.updateStatus();
    },


    // Data Changes
    setField(path, val) {
        this.state.dates.updated_at = Date.now();
        this.state.user.updated_by  = this.user;
        this.state.meta.dirty = true;

        if (val === undefined) {
            unset(this.state, path);
        } else {
            set(this.state, path, val);
        }
        m.redraw();
    },

    titleChange(entryName) {
        this.state.meta.name = entryName;
        this.state.meta.slug = sluggo(entryName);
        this.state.meta.dirty = true;

        m.redraw();
    },

    // UI
    toggleUI(key, force) {
        // todo: triple eq?
        // eslint-disable-next-line eqeqeq
        this.state.ui[key] = (force != null) ? Boolean(force) : !this.state.ui[key];
        m.redraw();
    },

    toggleSchedule(force) {
        this.toggleUI("schedule", force);
    },

    toggleInvalid(force) {
        this.toggleUI("invalid", force);

        if (force) {
            this.validity.debounceFade();
        }
    },

    // Persist
    save() {
        const self = this;

        let validSave,
            saveData;

        this.toggleSchedule(false);
        validSave = this.validity.isValidSave();

        if (!validSave) {
            this.toggleInvalid(true);

            return null;
        }

        this.state.ui.saving  = true;
        this.state.meta.dirty = false;
        m.redraw();

        saveData = snapshot.fromState(this.state);

        return this.ref.update(saveData, () => {
            self.state.ui.saving = false;
            m.redraw();
        });
    }
};
