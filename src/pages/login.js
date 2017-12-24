import m from "mithril";
import join from "url-join";

import config, { root } from "../config";
import db from "../lib/firebase";
import valid from "../lib/valid-auth";
import prefix from "../lib/prefix";

import * as layout from "./layout/index";

import css from "./login.css";

function loginRedirect() {
    window.location = config.loginBaseUrl +
        window.encodeURIComponent(join(window.location.origin, root, "/login"));
}

export function oninit(vnode) {
    if(config.auth === "jwt") {
        if(!m.route.param("auth")) {
            return loginRedirect();
        }

        return db.authWithCustomToken(m.route.param("auth"), function(error) {
            if(error) {
                console.log(error);

                return loginRedirect();
            }

            return m.route.set(prefix("/"));
        });
    }

    if(!config.auth || valid()) {
        return m.route.set(prefix("/"));
    }

    vnode.state.onsubmit = function(e) {
        var form = e.target.elements;

        e.preventDefault();

        db.authWithPassword({
            email    : form.email.value,
            password : form.password.value
        }, function(error) {
            if(error) {
                vnode.state.error = error.message;

                return m.redraw();
            }

            return m.route.set(prefix("/"));
        });
    };

    if(config.auth !== "password") {
        db.authWithOAuthRedirect(config.auth);
    }
}

export function view(vnode) {
    if(config.auth === "jwt") {
        if(m.route.param("auth")) {
            return m(layout, {
                content : m("div", { class : layout.css.content },
                    m("p", "Validating credentials...")
                )
            });
        }

        return m(layout, {
            content : m("div", { class : layout.css.content },
                m("p", "Redirecting to login...")
            )
        });
    }

    return m(layout, {
        title   : "Login",
        content : m("div", { class : layout.css.content },
            m("div", { class : layout.css.body },
                m("form", { class : css.form, onsubmit : vnode.state.onsubmit },
                    m("p",
                        m("label", { class : css.label }, "Email"),
                        m("input", { name : "email", type : "email" })
                    ),
                    m("p",
                        m("label", { class : css.label }, "Password"),
                        m("input", { name : "password", type : "password" })
                    ),
                    m("button", { class : css.button, type : "submit" }, "Login")
                ),

                m("p", { class : css.error }, vnode.state.error ? "ERROR: " + vnode.state.error : null)
            )
        )
    });
}
