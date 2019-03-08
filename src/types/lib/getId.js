export default function getId(attrs) {
    return attrs.path.length ?
        attrs.path.join("-") :
        attrs.details.key;
}
