import join from "url-join";

import { root } from "../config";

export default function prefix(str) {
    return join(root, str);
}
