import type { IRocketChatRecord } from './IRocketChatRecord';
import type { IRole } from './IRole';
import type { ILivechatVisitor } from './ILivechatVisitor';
import type { IUser } from './IUser';

import type { RoomType } from './RoomType';

type RoomID = string;

export interface ISubscription extends IRocketChatRecord {
	u: Pick<IUser, '_id' | 'username' | 'name'>;
	v: Pick<ILivechatVisitor, '_id' | 'username' | 'status' | 'name' | 'phone' |'token' | 'activity'> & {
        lastMessageTs?: Date;
		//phone?:string;
    };
	rid: RoomID;
	open: boolean;
	ts: Date;

	name: string;

	alert?: boolean;
	unread: number;
	t: RoomType;
	ls: Date;
	f?: boolean;
	lr: Date;
	hideUnreadStatus?: true;
	hideMentionStatus?: true;
	teamMain?: boolean;
	teamId?: string;

	userMentions: number;
	groupMentions: number;

	broadcast?: true;
	tunread?: Array<string>;
	tunreadGroup?: Array<string>;
	tunreadUser?: Array<string>;

	prid?: RoomID;

	roles?: IRole['_id'][];

	onHold?: boolean;
	encrypted?: boolean;
	E2EKey?: string;
	E2ESuggestedKey?: string;
	unreadAlert?: 'default' | 'all' | 'mentions' | 'nothing';

	fname?: string;

	code?: unknown;
	archived?: boolean;
	audioNotificationValue?: string;
	desktopNotifications?: 'all' | 'mentions' | 'nothing';
	mobilePushNotifications?: 'all' | 'mentions' | 'nothing';
	emailNotifications?: 'all' | 'mentions' | 'nothing';
	userHighlights?: string[];
	blocked?: unknown;
	blocker?: unknown;
	autoTranslate?: boolean;
	autoTranslateLanguage?: string;
	disableNotifications?: boolean;
	muteGroupMentions?: boolean;
	ignored?: IUser['_id'][];

	department?: unknown;

	desktopPrefOrigin?: 'subscription' | 'user';
	mobilePrefOrigin?: 'subscription' | 'user';
	emailPrefOrigin?: 'subscription' | 'user';

	/* @deprecated */
	customFields?: Record<string, any>;
}

export interface IOmnichannelSubscription extends ISubscription {
	department?: string; // TODO REMOVE/DEPRECATE no need keeo in both room and subscription
}

export interface ISubscriptionDirectMessage extends Omit<ISubscription, 'name'> {
	t: 'd';
}
