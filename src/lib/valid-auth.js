import db from "./firebase";

export default function validAuth() {
    const auth = db.getAuth();

    return auth && ((auth.expires * 1000) > Date.now());
}
