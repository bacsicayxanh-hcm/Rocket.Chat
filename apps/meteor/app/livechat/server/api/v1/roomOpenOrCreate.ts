import {check} from 'meteor/check';
import {Random} from '@rocket.chat/random';
import {LivechatRooms} from '@rocket.chat/models';
import type {ILivechatAgent, IOmnichannelRoom, SelectedAgent} from '@rocket.chat/core-typings';
import {OmnichannelSourceType} from '@rocket.chat/core-typings';

import {API} from '../../../../api/server';
import {findAgent, findGuest, getRoom, onCheckRoomParams} from '../lib/livechat';
import {isWidget} from '../../../../api/server/helpers/isWidget';

const isAgentWithInfo = (agentObj: ILivechatAgent | { hiddenInfo: true }): agentObj is ILivechatAgent => !('hiddenInfo' in agentObj);

API.v1.addRoute('livechat/room.openOrCreate', {
	async get() {
		// I'll temporary use check for validation, as validateParams doesnt support what's being done here
		const extraCheckParams = await onCheckRoomParams({
			token: String,
			rid: Match.Maybe(String),
			agentId: Match.Maybe(String),
		});

		check(this.queryParams, extraCheckParams as any);

		const { token, rid: roomId, agentId, ...extraParams } = this.queryParams;

		const guest = token && (await findGuest(token));
		if (!guest) {
			throw new Error('invalid-token');
		}

		// let room: IOmnichannelRoom | null;
		if (!roomId) {
			if (agentId) {
				let rooms: IOmnichannelRoom[] = await LivechatRooms.findByVisitorIdAndAgentId(guest._id,agentId,IOmnichannelRoom,{usersCount: 2}).toArray();
				if (rooms && rooms.length > 0 ) {
					return API.v1.success({room: rooms[0], newRoom: false });
				}
			}

			let agent: SelectedAgent | undefined;
			const agentObj = agentId && (await findAgent(agentId));
			if (agentObj) {
				if (isAgentWithInfo(agentObj)) {
					const { username = undefined } = agentObj;
					agent = { agentId, username };
				} else {
					agent = { agentId };
				}
			}

			const rid = Random.id();
			const roomInfo = {
				source: {
					type: isWidget(this.request.headers) ? OmnichannelSourceType.WIDGET : OmnichannelSourceType.API,
				},
			};

			const newRoom = await getRoom({ guest, rid, agent, roomInfo, extraParams });
			return API.v1.success(newRoom);
		}

		const froom = await LivechatRooms.findOneOpenByRoomIdAndVisitorToken(roomId, token, {});
		if (!froom) {
			throw new Error('invalid-room');
		}

		return API.v1.success({ room: froom, newRoom: false });
	},
});
