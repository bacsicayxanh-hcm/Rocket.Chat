import { Meteor } from 'meteor/meteor';
import { Random } from '@rocket.chat/random';
import crypto from 'crypto';
import { Match, check } from 'meteor/check';
import { Messages, AppsTokens, Users, Rooms, LivechatVisitors } from '@rocket.chat/models';
import { API } from '../api';
import PushNotification from '../../../push-notifications/server/lib/PushNotification';
import { canAccessRoomAsync } from '../../../authorization/server/functions/canAccessRoom';

export const _hashLoginToken = (loginToken: string): string => {
	const hash = crypto.createHash('sha256');
	hash.update(loginToken);
	return hash.digest('base64');
};

API.v1.addRoute(
	'push.token',
	{ authRequired: true },
	{
		async post() {
			const { id, type, value, appName } = this.bodyParams;

			if (id && typeof id !== 'string') {
				throw new Meteor.Error('error-id-param-not-valid', 'The required "id" body param is invalid.');
			}

			const deviceId = id || Random.id();

			if (!type || (type !== 'apn' && type !== 'gcm')) {
				throw new Meteor.Error('error-type-param-not-valid', 'The required "type" body param is missing or invalid.');
			}

			if (!value || typeof value !== 'string') {
				throw new Meteor.Error('error-token-param-not-valid', 'The required "value" body param is missing or invalid.');
			}

			if (!appName || typeof appName !== 'string') {
				throw new Meteor.Error('error-appName-param-not-valid', 'The required "appName" body param is missing or invalid.');
			}

			const result = await Meteor.callAsync('raix:push-update', {
				id: deviceId,
				token: { [type]: value },
				authToken: this.request.headers['x-auth-token'],
				appName,
				userId: this.userId,
			});

			return API.v1.success({ result });
		},
		async delete() {
			const { token } = this.bodyParams;

			if (!token || typeof token !== 'string') {
				throw new Meteor.Error('error-token-param-not-valid', 'The required "token" body param is missing or invalid.');
			}

			const affectedRecords = (
				await AppsTokens.deleteMany({
					$or: [
						{
							'token.apn': token,
						},
						{
							'token.gcm': token,
						},
					],
					userId: this.userId,
				})
			).deletedCount;

			if (affectedRecords === 0) {
				return API.v1.notFound();
			}

			return API.v1.success();
		},
	},
);

API.v1.addRoute(
	'push.get',
	{ authRequired: true },
	{
		async get() {
			const params = this.queryParams;
			check(
				params,
				Match.ObjectIncluding({
					id: String,
				}),
			);

			const receiver = await Users.findOneById(this.userId);
			if (!receiver) {
				throw new Error('error-user-not-found');
			}

			const message = await Messages.findOneById(params.id);
			if (!message) {
				throw new Error('error-message-not-found');
			}

			const room = await Rooms.findOneById(message.rid);
			if (!room) {
				throw new Error('error-room-not-found');
			}

			if (!(await canAccessRoomAsync(room, receiver))) {
				throw new Error('error-not-allowed');
			}

			const data = await PushNotification.getNotificationForMessageId({ receiver, room, message });

			return API.v1.success({ data });
		},
	},
);

API.v1.addRoute(
	'registerVisitorDeviceToken',
	{},
	{
		async post() {
			try {
				const { token, id, type, value, appName } = this.bodyParams;
				let deviceId = id || Random.id();
				if (typeof deviceId !== 'string') {
					throw new Error('Invalid device ID');
				}
				if (!token || typeof token !== 'string') {
					throw new Error('Invalid token');
				}
				if (!type || typeof token !== 'string' || type !== 'gcm') {
					throw new Error('Invalid device type');
				}
				if (!value || typeof value !== 'string') {
					throw new Error('Invalid device token');
				}
				if (!appName || typeof appName !== 'string') {
					throw new Error('Invalid app name');
				}
				const visitor = await LivechatVisitors.getVisitorByToken(token, { projection: { _id: 1 } });
				if (!visitor) {
					throw new Error('Invalid visitor');
				}

				let hashToken = _hashLoginToken(token);
				let doc = await AppsTokens.findOne({ userId: visitor._id });
				if (!doc) {
					doc = await AppsTokens.findOne({
						$and: [
							{ token: { [type]: value } }, // Match token
							{ appName: appName }, // Match appName
							{ token: { $exists: true } }, // Make sure token exists
						],
					});
				}

				if (!doc) {
					doc = {
						// _id: deviceId,
						token: { [type]: value },
						authToken: hashToken,
						appName: appName,
						userId: visitor._id,
						enabled: true,
						createdAt: new Date(),
						updatedAt: new Date(),
						metadata: {},
						_id: id || Random.id(),
						_updatedAt: new Date(),
					};
					await AppsTokens.insertOne(doc);
				} else {
					await AppsTokens.updateOne({ _id: doc._id }, {
						$set: {
							updatedAt: new Date(),
							token: { [type]: value },
							authToken: hashToken,
							userId:visitor._id,
						},
					});
				}
				if (doc && doc.token) {
					const removed = (
						await AppsTokens.deleteMany({
							$and: [
								{ _id: { $ne: doc._id } },
								{ token: doc.token }, // Match token
								{ appName: doc.appName }, // Match appName
								{ token: { $exists: true } }, // Make sure token exists
							],
						})
					).deletedCount;
					if (removed) {
						// logger.debug(`Removed ${removed} existing app items`);
					}
				
				}
				
				return API.v1.success({ result: doc });
			} catch (error) {
				return API.v1.failure(error);
			}
		},
		async delete() {
			const { deviceToken, visitorToken } = this.bodyParams;
			// Validate deviceToken
			if (!deviceToken || typeof deviceToken !== 'string') {
			  throw new Error('device-token-invalid');
			}
		  
			// Validate visitorToken
			if (!visitorToken || typeof visitorToken !== 'string') {
			  throw new Error('visitor-token-invalid');
			}
		  
			// Check if the visitor exists
			const visitor = await LivechatVisitors.getVisitorByToken(visitorToken, { projection: { _id: 1 } });
			if (!visitor) {
			  throw new Error('visitor-token-invalid');
			}
		  
			// Delete tokens for the specified device and visitor
			const deleteQuery = {
			  $or: [
				{ 'token.apn': deviceToken },
				{ 'token.gcm': deviceToken },
				{ 'token.fcm': deviceToken },
			  ],
			  userId: visitor._id,
			};
		  
			// Use try-catch to handle any potential errors during deletion
			try {
			  const deleteResult = await AppsTokens.deleteMany(deleteQuery);
			  // Check if any records were deleted
			  if (deleteResult.deletedCount === 0) {
				// You can uncomment this if you want to handle the case where no records were deleted
				// return API.v1.notFound();
			  }
			  return API.v1.success();
			} catch (error) {
			  console.error('Error deleting tokens:', error);
			  throw new Error('delete-tokens-failed');
			}
		  }
		  
	},
);