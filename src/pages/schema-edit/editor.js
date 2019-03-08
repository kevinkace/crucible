import m from "mithril";
import debounce from "lodash.debounce";
import editor from "codemirror";

// Require codemirror extra JS bits and bobs so they're included
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/selection/active-line";
import "codemirror/addon/comment/continuecomment";

export default {
    view(vnode) {
        const { ref, worker, source } = vnode.attrs;

        return m("textarea", {
                oncreate({ dom }) {
                    vnode.state.editor = editor.fromTextArea(dom, {
                        mode : "application/javascript",
                        lint : true,

                        indentUnit   : 4,
                        smartIndent  : false,
                        lineNumbers  : true,
                        lineWrapping : true,

                        // Plugin options
                        styleActiveLine  : true,
                        continueComments : true,

                        autoCloseBrackets : true,
                        matchBrackets     : true,

                        extraKeys : {
                            Tab(cm) {
                                return cm.somethingSelected() ?
                                    cm.indentSelection("add") :
                                    cm.execCommand(cm.options.indentWithTabs ? "insertTab" : "insertSoftTab");
                            },

                            "Shift-Tab"(cm) {
                                cm.indentSelection("subtract");
                            }
                        }
                    });

                    vnode.state.editor.on("changes", debounce(() => {
                        const text = vnode.state.editor.doc.getValue();

                        ref.child("source").set(text);

                        worker.postMessage(text);
                    }, 500, { maxWait : 5000 }));
                }
            },
            source
        );
    }
};
