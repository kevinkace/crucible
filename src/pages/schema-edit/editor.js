import m from "mithril";
import debounce from "lodash.debounce";
import editor from "codemirror";

// Require codemirror extra JS bits and bobs so they're included
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/selection/active-line";
import "codemirror/addon/comment/continuecomment";

export function view(vnode) {
    return m("textarea", {
            oncreate : function(vnode) {
                vnode.state.editor = editor.fromTextArea(vnode.dom, {
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
                        Tab : function(cm) {
                            if(cm.somethingSelected()) {
                                return cm.indentSelection("add");
                            }

                            return cm.execCommand(cm.options.indentWithTabs ? "insertTab" : "insertSoftTab");
                        },

                        "Shift-Tab" : function(cm) {
                            cm.indentSelection("subtract");
                        }
                    }
                });

                vnode.state.editor.on("changes", debounce(function() {
                    var text = vnode.state.editor.doc.getValue();

                    vnode.attrs.ref.child("source").set(text);

                    vnode.attrs.worker.postMessage(text);
                }, 500, { maxWait : 5000 }));
            }
        },
        vnode.attrs.source
    );
}
