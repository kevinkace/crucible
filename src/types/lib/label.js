import m from "mithril";

import css from "./types.css";
 
export default function(state, attrs) {
    var field = attrs.field,
        name  = field.name,
        style = css.label;
    
    if(field.required) {
        name += "*";
        style = css.required;
    }
     
    return m("label", {
        for   : state.id,
        class : style
    }, name);
}
