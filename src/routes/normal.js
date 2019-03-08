import m from "mithril";
import keys from "lodash.mapkeys";

import prefix from "../lib/prefix.js";
import auth from "../lib/require-auth.js";

import home from "../pages/home.js";
import login from "../pages/login.js";
import logout from "../pages/logout.js";
import schemaNew from "../pages/schema-new.js";
import schemaEdit from "../pages/schema-edit/index.js";
import edit from "../pages/content-edit/index.js";

import listing from "../pages/listing/index.js";

export default function() {
    m.route(document.body, prefix("/"), keys({
            "/" : auth(home),

            "/login"  : login,
            "/logout" : logout,

            "/new-schema"   : auth(schemaNew),
            "/:schema/edit" : auth(schemaEdit),
            "/:schema/:id"  : auth(edit),
            "/:schema"      : auth(listing),

            "/..." : {
                view() {
                    return m("h1", "404");
                }
            }
        },
        (value, key) => prefix(key)
    ));
}
