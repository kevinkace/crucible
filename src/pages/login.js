import m from "mithril";
import join from "url-join";

import config, { root } from "../config";
import db from "../lib/firebase";
import valid from "../lib/valid-auth";
import prefix from "../lib/prefix";

import layout, { layoutCss } from "./layout";

import css from "./login.css";

function loginRedirect() {
    window.location = config.loginBaseUrl +
        window.encodeURIComponent(join(window.location.origin, root, "/login"));
}

export default {
    oninit() {
        const authParam = m.route.param("auth");

        if (config.auth === "jwt") {
            if (!authParam) {
                return loginRedirect();
            }

            return db.authWithCustomToken(authParam, error => {
                if (error) {
                    console.log(error);

                    return loginRedirect();
                }

                return m.route.set(prefix("/"));
            });
        }

        if (!config.auth || valid()) {
            return m.route.set(prefix("/"));
        }

        if (config.auth !== "password") {
            db.authWithOAuthRedirect(config.auth);
        }
    },

    onsubmit(e) {
        const form = e.target.elements;

        e.preventDefault();

        db.authWithPassword({
            email    : form.email.value,
            password : form.password.value
        }, error => {
            if (error) {
                this.error = error.message;

                return m.redraw();
            }

            return m.route.set(prefix("/"));
        });
    },

    view(vnode) {
        const { error } = vnode.state;

        if (config.auth === "jwt") {
            if (m.route.param("auth")) {
                return m(layout,
                    m("div", { class : layoutCss.content },
                        m("p", "Validating credentials...")
                    )
                );
            }

            return m(layout,
                m("div", { class : layoutCss.content },
                    m("p", "Redirecting to login...")
                )
            );
        }

        return m(layout, { title : "Login" },
            m("div", { class : layoutCss.content },
                m("div", { class : layoutCss.body },
                    m("form", {
                            class    : css.form,
                            onsubmit : vnode.state.onsubmit
                        },
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

                    m("p", { class : css.error }, error ? `ERROR: ${error}` : null)
                )
            )
        );
    }
};
