import { isGETLivechatConfigParams } from '@rocket.chat/rest-typings';
import { LivechatRooms ,Users} from '@rocket.chat/models';
import {IOmnichannelRoom} from '@rocket.chat/core-typings';


import { API } from '../../../../api/server';
import { Livechat } from '../../lib/LivechatTyped';

import { callbacks } from '../../../../../lib/callbacks';

function getNameOfUsername(users: Map<string, string>, username: string): string {
	return users.get(username) || username;
}

API.v1.addRoute(
	'livechat/room.history',
	{ validateParams: isGETLivechatConfigParams },
	{
		async get() {
			const enabled = Livechat.enabled();

			if (!enabled) {
				return API.v1.success({ config: { enabled: false } });
			}

			const { token } = this.queryParams;
			const { sort, fields } = await this.parseJsonQuery();			
			const options = {
					sort,
					fields,
					projection: {
					departmentId: 1,
					servedBy: 1,
					open: 1,
					callStatus: 1,
                    lastMessage: 1,
					unread: 1,
					unreadNotLoaded:1,
				},
			};

			// const extraQuery = await callbacks.run('livechat.applyRoomRestrictions', {});
			//  var rooms : IOmnichannelRoom[] = await LivechatRooms.findOpenByVisitorToken(token, options, extraQuery).toArray();
			var rooms : IOmnichannelRoom[] = await LivechatRooms.findRoomsOpenByVisitorToken(token, options).toArray();
			const usernames: Set<string> = new Set();
			rooms.forEach((room) => {
				if (!room.servedBy.username) {
					return;
				}
				usernames.add(room.servedBy.username);
			});
			const names = new Map();
			(
				await Users.findUsersByUsernames([...usernames.values()], {
					projection: {
						username: 1,
						name: 1,
					},
				}).toArray()
			).forEach((user) => {
				names.set(user.username, user.name);
			});

			rooms.forEach((room: IOmnichannelRoom) => {
				if (!room.servedBy) {
					return;
				}
				room.servedBy.name = getNameOfUsername(names, room.servedBy.username);
			});

			return API.v1.success({
				rooms,
			});
		},
	},
);
