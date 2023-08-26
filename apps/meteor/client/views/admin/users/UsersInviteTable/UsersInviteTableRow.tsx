import { UserStatus as Status } from '@rocket.chat/core-typings';
import type { IRole, IUser } from '@rocket.chat/core-typings';
import { Box } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import React from 'react';

import { Roles } from '../../../../../app/models/client';
import { GenericTableRow, GenericTableCell } from '../../../../components/GenericTable';
import { UserStatus } from '../../../../components/UserStatus';
import UserAvatar from '../../../../components/avatar/UserAvatar';

type UsersInviteTableRowProps = {
	user: Pick<IUser, '_id' | 'username' | 'name' | 'status' | 'emails' | 'active' | 'avatarETag' | 'roles'>;
	onClick: (id: IUser['_id']) => void;
	mediaQuery: boolean;
};

const UsersInviteTableRow = ({ user, onClick, mediaQuery }: UsersInviteTableRowProps): ReactElement => {
	const t = useTranslation();
	const { _id, emails, username, name, status, roles, active, avatarETag } = user;
	const registrationStatusText = active ? t('Active') : t('Deactivated');

	const roleNames = (roles || [])
		.map((roleId) => (Roles.findOne(roleId, { fields: { name: 1 } }) as IRole | undefined)?.name)
		.filter((roleName): roleName is string => !!roleName)
		.join(', ');

	return (
		<GenericTableRow
			onKeyDown={(): void => onClick(_id)}
			onClick={(): void => onClick(_id)}
			tabIndex={0}
			role='link'
			action
			qa-user-id={_id}
		>
			<GenericTableCell withTruncatedText>
				<Box display='flex' alignItems='center'>
					{username && <UserAvatar size={mediaQuery ? 'x28' : 'x40'} username={username} etag={avatarETag} />}
					<Box display='flex' mi={8} withTruncatedText>
						<Box display='flex' flexDirection='column' alignSelf='center' withTruncatedText>
							<Box fontScale='p2m' color='default' withTruncatedText>
								<Box display='inline' mie='x8'>
									<UserStatus status={status || Status.OFFLINE} />
								</Box>
								{name || username}
							</Box>
							{!mediaQuery && name && (
								<Box fontScale='p2' color='hint' withTruncatedText>
									{`@${username}`}
								</Box>
							)}
						</Box>
					</Box>
				</Box>
			</GenericTableCell>
			{mediaQuery && (
				<GenericTableCell>
					<Box fontScale='p2m' color='hint' withTruncatedText>
						{username}
					</Box>
					<Box mi={4} />
				</GenericTableCell>
			)}

			<GenericTableCell withTruncatedText>{emails?.length && emails[0].address}</GenericTableCell>
			{mediaQuery && <GenericTableCell withTruncatedText>{roleNames}</GenericTableCell>}
			<GenericTableCell fontScale='p2' color='hint' withTruncatedText>
				{registrationStatusText}
			</GenericTableCell>
		</GenericTableRow>
	);
};

export default UsersInviteTableRow;
