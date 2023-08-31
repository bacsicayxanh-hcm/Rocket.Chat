import { isGETLivechatConfigParams } from '@rocket.chat/rest-typings';
import { LivechatRooms } from '@rocket.chat/models';

import { API } from '../../../../api/server';
import { Livechat } from '../../lib/LivechatTyped';

import { callbacks } from '../../../../../lib/callbacks';

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
			const options = {
				projection: {
					departmentId: 1,
					servedBy: 1,
					open: 1,
					callStatus: 1,
                    lastMessage: 1,
				},
			};

			const extraQuery = await callbacks.run('livechat.applyRoomRestrictions', {});
			const rooms = await LivechatRooms.findOpenByVisitorToken(token, options, extraQuery).toArray();

			return API.v1.success({
				rooms,
			});
		},
	},
);
