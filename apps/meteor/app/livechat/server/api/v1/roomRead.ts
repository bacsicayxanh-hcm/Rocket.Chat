import {findGuest} from '../lib/livechat';
import { API } from '../../../../api/server';
import {LivechatRooms} from '@rocket.chat/models';


API.v1.addRoute(
    'livechat/room.read',{
        async post() {
            if (!this.bodyParams || typeof this.bodyParams !== 'object') {
                throw new Error('Invalid or missing this.bodyParams');
            }
            
            const { token, rid: roomId, ls } = this.bodyParams;
            
            if (!token || typeof token !== 'string' || !token.trim()) {
                throw new Error('Invalid or missing token');
            }
            
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error('Invalid or missing rid');
            }
            
            if (!(ls instanceof Date)) {
                throw new Error('Invalid or missing ls');
            }
    
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
