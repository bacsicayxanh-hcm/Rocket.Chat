import type { IInvite } from '@rocket.chat/core-typings';
import type { OptionProp } from '@rocket.chat/ui-client';

// TODO: add correct filters!
const filterInvitesByEmail = (invite: Partial<IInvite>) => console.log(invite.days);
const filterInvitesByLink = (invite: Partial<IInvite>) => console.log(invite.days);

const filters: Record<string, (invite: Partial<IInvite>) => boolean> = {
	email: filterInvitesByEmail,
	link: filterInvitesByLink,
};

export const useFilteredTypesInvites = (selectedOptions: OptionProp[], isLoading: boolean, invites?: IInvite[]) => {
	if (isLoading || !invites) return [];
	if (selectedOptions.length === 0) return invites;

	let filtered: IInvite[] = [];

	selectedOptions.forEach((option) => {
		filtered = [...new Set([...filtered, ...invites.filter(filters[option.id])])];
	});

	return filtered;
};
