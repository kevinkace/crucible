import m from "mithril";

import config from "./config";

import setup from "./routes/setup";
import normal from "./routes/normal";

// Don't actually want the exports, just want them bundled
import "./_global.css";
import "./_pure.css";

m.route.prefix("");

window.m = m;

(function() {
    if (!config.firebase) {
        return setup();
    }

    return normal();
}());
