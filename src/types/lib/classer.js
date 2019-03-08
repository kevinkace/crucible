
export default function classer(field, cssClasses) {
    const currClasses = Array.isArray(cssClasses) ? cssClasses : [ cssClasses ];

    if (field.show && field.show.hidden) {
        currClasses.push("hidden");
    }

    return currClasses.join(" ");
}
