import { describe, expect, it, vi } from 'vitest';
import { load } from './+layout.server';

describe('ルートレイアウトの load', () => {
	it("app:user に依存し、url は参照しない(遷移のたびに読み直さない)", () => {
		const depends = vi.fn();
		const locals = { user: null, session: null, households: [], activeHousehold: null };
		const event = {
			locals,
			depends,
			get url(): URL {
				throw new Error('url を参照した');
			}
		};
		expect(load(event as unknown as Parameters<typeof load>[0])).toEqual({ user: null, households: [], activeHousehold: null });
		expect(depends).toHaveBeenCalledWith('app:user');
	});
});
