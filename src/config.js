import url from "url";
import assign from "lodash.assign";

const root = url.parse(document.baseURI).pathname;
const title = document.title;

export default assign({}, window.crucible || {});

export {
    root as root,
    title as title
};
