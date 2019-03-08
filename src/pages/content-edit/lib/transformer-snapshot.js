import clone from "lodash.clone";

export function toState(data) {
    const result = {
        meta : {
            name : data.name,
            slug : data.slug
        },

        user : {
            created_by : data.created_by,
            updated_by : data.updated_by,

            published_by   : data.published_by,
            unpublished_by : data.unpublished_by
        },

        dates : {
            created_at : data.created_at,
            updated_at : data.updated_at,

            published_at   : data.published_at,
            unpublished_at : data.unpublished_at
        },

        fields : data.fields
    };

    return result;
}


function filterHidden(fields, hidden) {
    // People can hide/show a field without losing work.
    // But we don't want to persist data from hidden fields,
    // so overwrite the data to be saved, but clone the
    // source data so we do not modify the form's data.
    const filtered = clone(fields);

    Object.keys(filtered).forEach(key => {
        if (hidden.indexOf(key) > -1) {
            filtered[key] = null;
        }
    });

    return filtered;
}

export function fromState(state) {
    const { dates, user, meta } = state;

    return {
        name : meta.name,
        slug : meta.slug,

        created_at : dates.created_at,
        updated_at : Date.now(),

        published_at   : dates.published_at,
        unpublished_at : dates.unpublished_at,

        created_by : user.created_by,
        updated_by : user.created_by,

        published_by   : user.published_by,
        unpublished_by : user.unpublished_by,

        fields : filterHidden(state.fields, state.form.hidden)
    };
}
