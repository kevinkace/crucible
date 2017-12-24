export default function(attrs) {
    return attrs.path.length ?
        attrs.path.join("-") :
        attrs.details.key;
}
