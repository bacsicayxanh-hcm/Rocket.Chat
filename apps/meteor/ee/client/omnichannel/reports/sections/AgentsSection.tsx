/* eslint-disable react/no-multi-comp */
import { Box, Flex, Skeleton } from '@rocket.chat/fuselage';
import React from 'react';

import { AgentsTable, BarChart, ReportCard } from '../components';
import { useAgentsSection } from '../hooks';
import { ellipsis } from '../utils/ellipsis';

const LoadingSkeleton = () => (
	<Box display='flex' height='100%' width='100%'>
		<Box flexGrow={1}>
			<Skeleton style={{ transform: 'none' }} height='100%' mb={8} mie={16} />
		</Box>
		<Box flexGrow={1}>
			<Skeleton height={28} />
			<Skeleton height={28} />
			<Skeleton height={28} />
			<Skeleton height={28} />
			<Skeleton height={28} />
		</Box>
	</Box>
);

export const AgentsSection = () => {
	const { data, ...config } = useAgentsSection();

	return (
		<ReportCard {...config} height={360} loadingSkeleton={<LoadingSkeleton />}>
			<Box display='flex' style={{ gap: '16px' }}>
				<Flex.Item grow={1}>
					<BarChart
						data={data.slice(0, 5)}
						maxWidth='50%'
						height={360}
						indexBy='label'
						keys={['value']}
						margins={{ top: 20, right: 0, bottom: 50, left: 50 }}
						axis={{
							axisBottom: {
								tickSize: 0,
								tickRotation: 0,
								format: (v) => ellipsis(v, 10),
							},
							axisLeft: {
								tickSize: 0,
								tickRotation: 0,
								tickValues: 4,
							},
						}}
					/>
				</Flex.Item>
				<Flex.Item grow={1}>
					<AgentsTable data={data} />
				</Flex.Item>
			</Box>
		</ReportCard>
	);
};
