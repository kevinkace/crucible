import m from "mithril";
import keys from "lodash.mapkeys";

import prefix from "../lib/prefix";
import * as setup from "../pages/setup.js";

export default function() {
    // todo: use prefix()
    m.route.prefix("");
    m.route(
        document.body,
        prefix("/setup"),
        keys({
            "/setup" : setup
        }, function(value, key) {
            return prefix(key);
        })
    );
}
