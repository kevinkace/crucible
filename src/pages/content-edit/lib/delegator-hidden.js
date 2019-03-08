export default function Hidden(content) {
    this.content = content;
}

Hidden.prototype = {
    // Hidden / Dependent fields.
    getHiddenIndex(key) {
        return this.content.get().form.hidden.indexOf(key);
    },

    register(key, isHidden) {
        if (isHidden) {
            this.add(key);

            return;
        }

        this.remove(key);
    },

    add(key) {
        const state = this.content.get();
        const index = this.getHiddenIndex(key);

        if (index === -1) {
            state.form.hidden.push(key);
        }
    },

    remove(key) {
        const state = this.content.get();
        const index = this.getHiddenIndex(key);

        if (index > -1) {
            state.form.hidden.splice(index, 1);
        }
    }
};
