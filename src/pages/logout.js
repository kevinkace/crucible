import m from "mithril";

import db from "../lib/firebase";
import prefix from "../lib/prefix";

export function oninit() {
    db.unauth();
    
    m.route.set(prefix("/"));
}
