import {findGuest} from '../lib/livechat';
import { API } from '../../../../api/server';
import {LivechatRooms} from '@rocket.chat/models';
import {
	isPOSTLivechatReadRoomMessageParams,
} from '@rocket.chat/rest-typings';

API.v1.addRoute(
    'livechat/readRoomMessage',
    { validateParams: isPOSTLivechatReadRoomMessageParams },
    {
        async post() {
            const { token, rid,ls } = this.bodyParams;
    
    
            const guest = token && (await findGuest(token));
            if (!guest) {
                throw new Error('invalid-token');
            }

            const fRoom = await LivechatRooms.findOneOpenByRoomIdAndVisitorToken(rid, token, {});
            if (!fRoom) {
                throw new Error('invalid-room');
            }
            var lastSeen : Date= new Date(ls); 
            await LivechatRooms.setVisitorLastSeenByRoomId(rid, lastSeen);

            return API.v1.success({ rid });
        },
    }
);
