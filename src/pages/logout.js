import m from "mithril";

import db from "../lib/firebase";
import prefix from "../lib/prefix";

export default {
    oninit() {
        db.unauth();

        m.route.set(prefix("/"));
    },
    // no-op?
    view() {
        return null;
    }
};
