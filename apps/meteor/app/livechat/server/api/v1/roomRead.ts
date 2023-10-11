
import {findGuest, onCheckRoomParams} from '../lib/livechat';
import { API } from '../../../../api/server';
import {LivechatRooms} from '@rocket.chat/models';


API.v1.addRoute(
    'livechat/room.read',
    {
        async post() {
            const extraCheckParams = await onCheckRoomParams({
                token: String,
                rid: Match.Maybe(String),
                ls: Match.Maybe(Date),
            });

            check(this.queryParams, extraCheckParams as any);

            const { token, rid: roomId ,ls: ls} = this.queryParams;


            const guest = token && (await findGuest(token));
            if (!guest) {
                throw new Error('invalid-token');
            }

            const fRoom = await LivechatRooms.findOneOpenByRoomIdAndVisitorToken(roomId, token, {});
            if (!fRoom) {
                throw new Error('invalid-room');
            }
            await LivechatRooms.setVisitorLastSeenByRoomId(roomId, ls);

            return API.v1.success();
        },
    }
);
