import isFuture from "date-fns/is_future";
import isPast from "date-fns/is_past";

const STATUS = {
    UPDATED     : "updated",
    UNPUBLISHED : "unpublished",
    SCHEDULED   : "scheduled",
    LIVE        : "live"
};

export default function getItemStatus(itemData) {
    if (isPast(itemData.unpublished_at)) {
        return STATUS.UNPUBLISHED;
    }

    if (isFuture(itemData.published_at)) {
        return STATUS.SCHEDULED;
    }

    if (isPast(itemData.published_at)) {
        return STATUS.LIVE;
    }

    if (itemData.updated_at) {
        return STATUS.UPDATED;
    }

    return "...";
}
