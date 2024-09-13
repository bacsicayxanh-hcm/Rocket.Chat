import type { IRoom, ISubscription } from '@rocket.chat/core-typings';
import { isOmnichannelRoom } from '@rocket.chat/core-typings';
import { Box, Tag } from '@rocket.chat/fuselage';
import React from 'react';

import { RoomActivityIcon } from '../../omnichannel/components/RoomActivityIcon';
import { useOmnichannelPriorities } from '../../omnichannel/hooks/useOmnichannelPriorities';
import { PriorityIcon } from '../../omnichannel/priorities/PriorityIcon';

export const OmnichannelBadges = ({ room }: { room: ISubscription & IRoom }) => {
	const { enabled: isPriorityEnabled } = useOmnichannelPriorities();

	if (!isOmnichannelRoom(room)) {
		return null;
	}

	return (
		<>
			{isPriorityEnabled ? <PriorityIcon level={room.priorityWeight} /> : null}
			<RoomActivityIcon room={room} />
			{room.tags?.map((tag) => {
				return (
					<Box key={tag} mie={1} display='inline'>
						<Tag medium={true} variant='primary' style={{ display: 'inline' }}>
							{tag}
						</Tag>
					</Box>
				);
			})}
		</>
	);
};
