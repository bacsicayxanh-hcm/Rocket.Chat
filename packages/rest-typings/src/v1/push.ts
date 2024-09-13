import type { IMessage, IPushNotificationConfig, IPushTokenTypes, IPushToken,IPushGuestTokenTypes} from '@rocket.chat/core-typings';
import Ajv from 'ajv';

const ajv = new Ajv({
	coerceTypes: true,
});

type PushTokenProps = {
	id?: string;
	type: IPushTokenTypes;
	value: string;
	appName: string;
};

const PushTokenPropsSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			nullable: true,
		},
		type: {
			type: 'string',
		},
		value: {
			type: 'string',
		},
		appName: {
			type: 'string',
		},
	},
	required: ['type', 'value', 'appName'],
	additionalProperties: false,
};

export const isPushTokenProps = ajv.compile<PushTokenProps>(PushTokenPropsSchema);

type PushGetProps = {
	id: string;
};

// Custom: Start
type RegisterVisitorDeviceTokenProps = {
	token: string
	id?: string;
	type: IPushGuestTokenTypes;
	value: string;
	appName: string;
};

const RegisterVisitorDeviceTokenPropsSchema = {
	type: 'object',
	properties: {
		token: {
			type: 'string',
		},
		id: {
			type: 'string',
			nullable: true,
		},
		type: {
			type: 'string',
		},
		value: {
			type: 'string',
		},
		appName: {
			type: 'string',
		},
	},
	required: ['type', 'value', 'appName','token'],
	additionalProperties: false,
};

export const isRegisterVisitorDeviceTokenProps = ajv.compile<RegisterVisitorDeviceTokenProps>(RegisterVisitorDeviceTokenPropsSchema);

// Custom: End

const PushGetPropsSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
		},
	},
	required: ['id'],
	additionalProperties: false,
};

export const isPushGetProps = ajv.compile<PushGetProps>(PushGetPropsSchema);

export type PushEndpoints = {
	'/v1/push.token': {
		POST: (payload: PushTokenProps) => { result: IPushToken };
		DELETE: (payload: { token: string }) => void;
	};
    // Custom: Start
	'/v1/registerVisitorDeviceToken': {
		POST: (payload: RegisterVisitorDeviceTokenProps) => { result: IPushToken };
		DELETE: (payload: { deviceToken: string, visitorToken : string}) => void;
	};
    // Custom: End
	'/v1/push.get': {
		GET: (params: PushGetProps) => {
			data: {
				message: IMessage;
				notification: IPushNotificationConfig;
			};
		};
	};
};
