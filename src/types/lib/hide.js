import get from "lodash.get";

/**
 * See README for example schema with a hidden/dependent field.
 */

function rxFindMatch(src, target) {
    const rx = new RegExp(src, "i");

    let values;

    if (rx.test(target)) {
        return true;
    }

    values = Array.isArray(target) ?
        target :
        Object.keys(target).map(key => target[key]);

    return values.find(str => rx.test(str));
}

export default function hide(state, field) {
    const dependsOn = get(field, [ "show", "field" ]);

    let src,
        target;

    // No conditional show config, or missing target field
    if (!dependsOn) {
        return false;
    }

    src = field.show.value;
    target = get(state, dependsOn);

    // No target value, so have to hide it
    if (typeof target === "undefined" || target === null) {
        return true;
    }

    // RegExp matched
    // * If appropriate, `field.show.type` will be set to "regexp" by `parse-schema.js`
    if (field.show.type === "regexp" && rxFindMatch(src, target)) {
        return false;
    }

    // Values match-ish
    // eslint-disable-next-line eqeqeq
    if (src == target) {
        return false;
    }

    // Otherwise this field should hide
    return true;
}
