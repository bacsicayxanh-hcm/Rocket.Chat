import moment from 'moment';
import {
	Rooms as RoomRaw,
	LivechatRooms,
	LivechatDepartment as LivechatDepartmentRaw,
	LivechatCustomField,
	LivechatInquiry,
	Users,
} from '@rocket.chat/models';
import { api } from '@rocket.chat/core-services';
import type { Document } from 'mongodb';
import type { ILivechatInquiryRecord, IOmnichannelRoom, IOmnichannelServiceLevelAgreements } from '@rocket.chat/core-typings';

import { memoizeDebounce } from './debounceByParams';
import { settings } from '../../../../../app/settings/server';
import { RoutingManager } from '../../../../../app/livechat/server/lib/RoutingManager';
import { dispatchAgentDelegated } from '../../../../../app/livechat/server/lib/Helper';
import { logger, helperLogger } from './logger';
import { OmnichannelQueueInactivityMonitor } from './QueueInactivityMonitor';
import { getInquirySortMechanismSetting } from '../../../../../app/livechat/server/lib/settings';
import { updateInquiryQueueSla } from './SlaHelper';

type QueueInfo = {
	message: {
		text: any;
		user: {
			_id: string;
			username: string;
		};
	};
	statistics: Document;
	numberMostRecentChats: number;
};

type InquiryWithExtraData = Pick<ILivechatInquiryRecord, '_id' | 'rid' | 'name' | 'ts' | 'status' | 'department'> & {
	position: number;
	defaultAgent?: { username: string; agentId: string };
};

export const getMaxNumberSimultaneousChat = async ({ agentId, departmentId }: { agentId?: string; departmentId?: string }) => {
	if (departmentId) {
		const department = await LivechatDepartmentRaw.findOneById(departmentId);
		const { maxNumberSimultaneousChat = 0 } = department || {};
		if (maxNumberSimultaneousChat > 0) {
			return maxNumberSimultaneousChat;
		}
	}

	if (agentId) {
		const user = await Users.getAgentInfo(agentId);
		const { livechat: { maxNumberSimultaneousChat = 0 } = {} } = user || {};
		if (maxNumberSimultaneousChat > 0) {
			return maxNumberSimultaneousChat;
		}
	}

	return settings.get<number>('Livechat_maximum_chats_per_agent');
};

const getWaitingQueueMessage = async (departmentId?: string) => {
	const department = departmentId ? await LivechatDepartmentRaw.findOneById(departmentId) : null;
	if (department?.waitingQueueMessage) {
		return department.waitingQueueMessage;
	}

	return settings.get<string>('Livechat_waiting_queue_message');
};

const getQueueInfo = async (department?: string) => {
	const numberMostRecentChats = settings.get<number>('Livechat_number_most_recent_chats_estimate_wait_time');
	const statistics = await RoomRaw.getMostRecentAverageChatDurationTime(numberMostRecentChats, department);
	const text = await getWaitingQueueMessage(department);
	const message = {
		text,
		user: { _id: 'rocket.cat', username: 'rocket.cat' },
	};
	return { message, statistics, numberMostRecentChats };
};

const getSpotEstimatedWaitTime = (spot: number, maxNumberSimultaneousChat: number, avgChatDuration: number) => {
	if (!maxNumberSimultaneousChat || !avgChatDuration) {
		return;
	}
	// X = spot
	// N = maxNumberSimultaneousChat
	// Estimated Wait Time = ([(N-1)/X]+1) *Average Chat Time of Most Recent X(Default = 100) Chats
	return ((spot - 1) / maxNumberSimultaneousChat + 1) * avgChatDuration;
};

const normalizeQueueInfo = async ({
	position,
	queueInfo,
	department,
}: {
	position: number;
	department?: string;
	queueInfo?: QueueInfo;
}) => {
	if (!queueInfo) {
		queueInfo = await getQueueInfo(department);
	}

	const { message, numberMostRecentChats, statistics: { avgChatDuration } = {} } = queueInfo;
	const spot = position + 1;
	const estimatedWaitTimeSeconds = getSpotEstimatedWaitTime(spot, numberMostRecentChats, avgChatDuration);
	return { spot, message, estimatedWaitTimeSeconds };
};

export const dispatchInquiryPosition = async (inquiry: InquiryWithExtraData, queueInfo?: QueueInfo) => {
	const { position, department } = inquiry;
	const data = await normalizeQueueInfo({ position, queueInfo, department });
	const propagateInquiryPosition = (inquiry: InquiryWithExtraData) => {
		void api.broadcast('omnichannel.room', inquiry.rid, {
			type: 'queueData',
			data,
		});
	};

	return setTimeout(() => {
		propagateInquiryPosition(inquiry);
	}, 1000);
};

const dispatchWaitingQueueStatus = async (department?: string) => {
	if (!settings.get('Livechat_waiting_queue') && !settings.get('Omnichannel_calculate_dispatch_service_queue_statistics')) {
		return;
	}

	helperLogger.debug(`Updating statuses for queue ${department || 'Public'}`);
	const queue = await LivechatInquiry.getCurrentSortedQueueAsync({
		department,
		queueSortBy: getInquirySortMechanismSetting(),
	});

	if (!queue.length) {
		return;
	}

	const queueInfo = await getQueueInfo(department);
	queue.forEach((inquiry) => {
		void dispatchInquiryPosition(inquiry, queueInfo);
	});
};

// When dealing with lots of queued items we need to make sure to notify their position
// but we don't need to notify _each_ change that takes place, just their final position
export const debouncedDispatchWaitingQueueStatus = memoizeDebounce(dispatchWaitingQueueStatus, 1200);

export const processWaitingQueue = async (department: string | undefined, inquiry: InquiryWithExtraData) => {
	const queue = department || 'Public';
	helperLogger.debug(`Processing items on queue ${queue}`);

	helperLogger.debug(`Processing inquiry ${inquiry._id} from queue ${queue}`);
	const { defaultAgent } = inquiry;
	const room = await RoutingManager.delegateInquiry(inquiry, defaultAgent);

	const propagateAgentDelegated = async (rid: string, agentId: string) => {
		await dispatchAgentDelegated(rid, agentId);
	};

	if (room?.servedBy) {
		const {
			_id: rid,
			servedBy: { _id: agentId },
		} = room;
		helperLogger.debug(`Inquiry ${inquiry._id} taken successfully by agent ${agentId}. Notifying`);
		setTimeout(() => {
			void propagateAgentDelegated(rid, agentId);
		}, 1000);

		return true;
	}

	return false;
};

export const setPredictedVisitorAbandonmentTime = async (room: IOmnichannelRoom) => {
	if (
		!room.v?.lastMessageTs ||
		!settings.get('Livechat_abandoned_rooms_action') ||
		settings.get('Livechat_abandoned_rooms_action') === 'none'
	) {
		return;
	}

	let secondsToAdd = settings.get<number>('Livechat_visitor_inactivity_timeout');

	const department = room.departmentId ? await LivechatDepartmentRaw.findOneById(room.departmentId) : null;
	if (department?.visitorInactivityTimeoutInSeconds) {
		secondsToAdd = department.visitorInactivityTimeoutInSeconds;
	}

	if (secondsToAdd <= 0) {
		return;
	}

	const willBeAbandonedAt = moment(room.v.lastMessageTs).add(Number(secondsToAdd), 'seconds').toDate();
	await LivechatRooms.setPredictedVisitorAbandonmentByRoomId(room._id, willBeAbandonedAt);
};

export const updatePredictedVisitorAbandonment = async () => {
	if (!settings.get('Livechat_abandoned_rooms_action') || settings.get('Livechat_abandoned_rooms_action') === 'none') {
		await LivechatRooms.unsetAllPredictedVisitorAbandonment();
	} else {
		// Eng day: use a promise queue to update the predicted visitor abandonment time instead of all at once
		const promisesArray: Promise<void>[] = [];
		await LivechatRooms.findOpen().forEach((room) => {
			promisesArray.push(setPredictedVisitorAbandonmentTime(room));
		});

		await Promise.all(promisesArray);
	}
};

export const updateQueueInactivityTimeout = async () => {
	const queueTimeout = settings.get<number>('Livechat_max_queue_wait_time');
	if (queueTimeout <= 0) {
		logger.debug('QueueInactivityTimer: Disabling scheduled closing');
		await OmnichannelQueueInactivityMonitor.stop();
		return;
	}

	logger.debug('QueueInactivityTimer: Updating estimated inactivity time for queued items');
	await LivechatInquiry.getQueuedInquiries({ projection: { _updatedAt: 1 } }).forEach((inq) => {
		const aggregatedDate = moment(inq._updatedAt).add(queueTimeout, 'minutes');
		try {
			void OmnichannelQueueInactivityMonitor.scheduleInquiry(inq._id, new Date(aggregatedDate.format()));
		} catch (e) {
			// this will usually happen if other instance attempts to re-create a job
			logger.error({ err: e });
		}
	});
};

export const updateSLAInquiries = async (sla?: Pick<IOmnichannelServiceLevelAgreements, '_id' | 'dueTimeInMinutes'>) => {
	if (!sla) {
		return;
	}

	const { _id: slaId } = sla;
	const promises: Promise<void>[] = [];
	await LivechatRooms.findOpenBySlaId(slaId, {}).forEach((room) => {
		promises.push(updateInquiryQueueSla(room._id, sla));
	});
	await Promise.allSettled(promises);
};

export const getLivechatCustomFields = async () => {
	const customFields = await LivechatCustomField.find({
		visibility: 'visible',
		scope: 'visitor',
		public: true,
	}).toArray();
	return customFields.map(({ _id, label, regexp, required = false, type, defaultValue = null, options }) => ({
		_id,
		label,
		regexp,
		required,
		type,
		defaultValue,
		...(options && options !== '' && { options: options.split(',') }),
	}));
};

export const getLivechatQueueInfo = async (room?: IOmnichannelRoom) => {
	if (!room) {
		return null;
	}

	if (!settings.get('Livechat_waiting_queue')) {
		return null;
	}

	if (!settings.get('Omnichannel_calculate_dispatch_service_queue_statistics')) {
		return null;
	}

	const { _id: rid, departmentId: department } = room;
	const inquiry = await LivechatInquiry.findOneByRoomId(rid, { projection: { _id: 1, status: 1 } });
	if (!inquiry) {
		return null;
	}

	const { _id, status } = inquiry;
	if (status !== 'queued') {
		return null;
	}

	const [inq] = await LivechatInquiry.getCurrentSortedQueueAsync({
		inquiryId: _id,
		department,
		queueSortBy: getInquirySortMechanismSetting(),
	});

	if (!inq) {
		return null;
	}

	return normalizeQueueInfo(inq);
};