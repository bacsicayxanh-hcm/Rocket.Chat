import { LivechatRooms } from '@rocket.chat/models';

import type { IOmnichannelRoom } from '@rocket.chat/core-typings';

import { API } from '../../../../api/server';
import { findGuest } from '../lib/livechat';

API.v1.addRoute('livechat/getBadge', {
    async get() {
        const { token } = this.queryParams;
        if (!token) {
            throw new Error('invalid-token');
        }

        const guest = await findGuest(token);
        if (!guest) {
            throw new Error('invalid-token');
        }

        const rooms: IOmnichannelRoom[] = await LivechatRooms.findByVisitorId(guest._id, { projection: { unread: 1 ,open:1} }, {}).toArray();

        // var fRoom = LivechatRooms.findByVisitorId(userId).toArray();
        let countUnread = 0;
        rooms.forEach((element) => {
            if (element.open) {
                countUnread += element.unread ?? 0;
            }
        });

        return API.v1.success({ unread: countUnread, success: true });
    },
});
