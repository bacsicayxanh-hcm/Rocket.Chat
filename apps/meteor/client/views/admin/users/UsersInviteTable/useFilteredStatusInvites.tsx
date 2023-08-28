import type { IInvite } from '@rocket.chat/core-typings';
import type { OptionProp } from '@rocket.chat/ui-client';

// TODO: add correct filters!
const filterInvitesByPending = (invite: Partial<IInvite>) => console.log(invite.days);
const filterInvitesByAccepted = (invite: Partial<IInvite>) => console.log(invite.days);
const filterInvitesByExpired = (invite: Partial<IInvite>) => console.log(invite.days);

const filters: Record<string, (invite: Partial<IInvite>) => boolean> = {
	pending: filterInvitesByPending,
	accepted: filterInvitesByAccepted,
	expired: filterInvitesByExpired,
};

export const useFilteredStatusInvites = (selectedOptions: OptionProp[], isLoading: boolean, invites?: IInvite[]) => {
	if (isLoading || !invites) return [];
	if (selectedOptions.length === 0) return invites;

	let filtered: IInvite[] = [];

	selectedOptions.forEach((option) => {
		filtered = [...new Set([...filtered, ...invites.filter(filters[option.id])])];
	});

	return filtered;
};
