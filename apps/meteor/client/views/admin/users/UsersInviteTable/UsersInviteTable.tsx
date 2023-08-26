import { Pagination } from '@rocket.chat/fuselage';
import { useMediaQuery, useDebouncedValue, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { escapeRegExp } from '@rocket.chat/string-helpers';
import { useEndpoint, useRoute, useToastMessageDispatch, useTranslation } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement, MutableRefObject } from 'react';
import React, { useRef, useMemo, useState, useEffect } from 'react';

import FilterByText from '../../../../components/FilterByText';
import GenericNoResults from '../../../../components/GenericNoResults';
import {
	GenericTable,
	GenericTableHeader,
	GenericTableHeaderCell,
	GenericTableBody,
	GenericTableLoadingTable,
} from '../../../../components/GenericTable';
import { usePagination } from '../../../../components/GenericTable/hooks/usePagination';
import { useSort } from '../../../../components/GenericTable/hooks/useSort';
import UsersInviteTableRow from './UsersInviteTableRow';

type InviteFilters = {
	searchText: string;
	status: OptionProp[];
	types: OptionProp[];
};
// TODO: create functions to find user informations about: Invite type; Email; Date; Invite status; Usage allowance!

// TODO: Missing error state
const UsersInviteTable = ({ reload }: { reload: MutableRefObject<() => void> }): ReactElement | null => {
	const t = useTranslation();
	const usersRoute = useRoute('admin-users');
	const mediaQuery = useMediaQuery('(min-width: 1024px)');
	const [inviteFilters, setInviteFilters] = useState<InviteFilters>({ searchText: '', status: [], types: [] });

	const prevInviteFilterText = useRef<string>(inviteFilters.searchText);

	// TODO: check if sorters are working: 'Invite type | Email | Date | Invite status | Usage allowance'
	const { sortBy, sortDirection, setSort } = useSort<'type' | 'emails.address' | 'date' | 'inviteStatus' | 'usage'>('type');
	const { current, itemsPerPage, setItemsPerPage, setCurrent, ...paginationProps } = usePagination();
	const searchText = useDebouncedValue(inviteFilters.searchText, 500);

	const query = useDebouncedValue(
		useMemo(() => {
			if (searchText !== prevInviteFilterText.current) {
				setCurrent(0);
			}

			// TODO: fix this and check if it's working!
			return {
				fields: JSON.stringify({
					name: 1,
					username: 1,
					emails: 1,
					roles: 1,
					status: 1,
					avatarETag: 1,
					active: 1,
				}),
				query: JSON.stringify({
					$or: [
						{ 'emails.address': { $regex: escapeRegExp(searchText), $options: 'i' } },
						{ username: { $regex: escapeRegExp(searchText), $options: 'i' } },
						{ name: { $regex: escapeRegExp(searchText), $options: 'i' } },
					],
				}),
				sort: `{ "${sortBy}": ${sortDirection === 'asc' ? 1 : -1} }`,
				count: itemsPerPage,
				offset: searchText === prevInviteFilterText.current ? current : 0,
			};
		}, [searchText, sortBy, sortDirection, itemsPerPage, current, setCurrent]),
		500,
	);

	const getUsers = useEndpoint('GET', '/v1/users.list');

	const dispatchToastMessage = useToastMessageDispatch();

	const { data, isLoading, error, isSuccess, refetch } = useQuery(
		['users', query],
		async () => {
			const users = await getUsers(query);
			return users;
		},
		{
			onError: (error) => {
				dispatchToastMessage({ type: 'error', message: error });
			},
		},
	);

	useEffect(() => {
		reload.current = refetch;
	}, [reload, refetch]);

	useEffect(() => {
		prevInviteFilterText.current = searchText;
	}, [searchText]);

	const handleClick = useMutableCallback((id): void =>
		// TODO: use router.navigate or usersRout.push?
		usersRoute.push({
			context: 'info',
			id,
		}),
	);

	const headers = useMemo(
		() => [
			<GenericTableHeaderCell w='x200' key='name' direction={sortDirection} active={sortBy === 'type'} onClick={setSort} sort='type'>
				{t('Invite_type')}
			</GenericTableHeaderCell>,

			<GenericTableHeaderCell
				w='x140'
				key='email'
				direction={sortDirection}
				active={sortBy === 'emails.address'}
				onClick={setSort}
				sort='emails.address'
			>
				{t('Email')}
			</GenericTableHeaderCell>,

			<GenericTableHeaderCell w='x120' key='date' direction={sortDirection} active={sortBy === 'date'} onClick={setSort} sort='date'>
				{t('Date')}
			</GenericTableHeaderCell>,

			// TODO: check which sorts need this:
			// mediaQuery && (
			// 	<GenericTableHeaderCell w='x120' key='roles' onClick={setSort}>
			// 		{t('Roles')}
			// 	</GenericTableHeaderCell>
			// ),

			<GenericTableHeaderCell
				w='x100'
				key='inviteStatus'
				direction={sortDirection}
				active={sortBy === 'inviteStatus'}
				onClick={setSort}
				sort='inviteStatus'
			>
				{t('Invite_status')}
			</GenericTableHeaderCell>,

			<GenericTableHeaderCell w='x100' key='usage' direction={sortDirection} active={sortBy === 'usage'} onClick={setSort} sort='usage'>
				{t('Usage_allowance')}
			</GenericTableHeaderCell>,
		],
		[mediaQuery, setSort, sortBy, sortDirection, t],
	);

	if (error) {
		return null;
	}

	return (
		<>
			<FilterByText autoFocus placeholder={t('Search_Users')} onChange={({ text }): void => setText(text)} />
			{isLoading && (
				<GenericTable>
					<GenericTableHeader>{headers}</GenericTableHeader>
					<GenericTableBody>{isLoading && <GenericTableLoadingTable headerCells={5} />}</GenericTableBody>
				</GenericTable>
			)}
			{data?.users && data.count > 0 && isSuccess && (
				<>
					<GenericTable>
						<GenericTableHeader>{headers}</GenericTableHeader>
						<GenericTableBody>
							{data?.users.map((user) => (
								<UsersInviteTableRow key={user._id} onClick={handleClick} mediaQuery={mediaQuery} user={user} />
							))}
						</GenericTableBody>
					</GenericTable>
					<Pagination
						divider
						current={current}
						itemsPerPage={itemsPerPage}
						count={data?.total || 0}
						onSetItemsPerPage={setItemsPerPage}
						onSetCurrent={setCurrent}
						{...paginationProps}
					/>
				</>
			)}
			{isSuccess && data?.count === 0 && <GenericNoResults />}
		</>
	);
};

export default UsersInviteTable;
