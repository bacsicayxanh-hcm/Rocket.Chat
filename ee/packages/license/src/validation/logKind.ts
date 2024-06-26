import type { LicenseBehavior } from '../definition/LicenseBehavior';

export const logKind = (behavior: LicenseBehavior) => {
	switch (behavior) {
		case 'prevent_installation':
		case 'invalidate_license':
			return 'error';
		default:
			return 'info';
	}
};
