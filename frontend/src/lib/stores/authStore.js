import { writable } from 'svelte/store'; // reactive auth state

const STORAGE_KEY = 'yukti-auth'; // auth persistence key

const emptyAuth = {
	user: null, // no user by default
	token: null, // no token by default
	isAuthenticated: false // logged out by default
};

const readStorage = () => {
	if (typeof window === 'undefined') return emptyAuth; // skip SSR

	try {
		const raw = localStorage.getItem(STORAGE_KEY); // read saved auth
		if (!raw) return emptyAuth; // return empty state

		const parsed = JSON.parse(raw); // parse saved JSON
		return {
			user: parsed?.user ?? null, // keep persisted user
			token: parsed?.token ?? null, // keep persisted token
			isAuthenticated: Boolean(parsed?.token) // infer auth from token
		};
	} catch (error) {
		console.error('[authStore] storage parse failed', error); // log parse issue
		return emptyAuth; // fail safe
	}
};

const persist = (value) => {
	if (typeof window === 'undefined') return; // skip SSR

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); // persist state
	} catch (error) {
		console.error('[authStore] storage write failed', error); // log storage issue
	}
};

const createAuthStore = () => {
	const { subscribe, set, update } = writable(readStorage()); // init from storage

	return {
		subscribe, // expose subscription
		setAuth: (payload) => {
			const normalized = {
				user: {
					_id: payload?._id ?? payload?.user?._id ?? payload?.user?.id ?? null, // normalize id
					email: payload?.email ?? payload?.user?.email ?? null, // normalize email
					role: payload?.role ?? payload?.user?.role ?? 'user' // register route lacks role
				},
				token: payload?.token ?? null, // normalize token
				isAuthenticated: Boolean(payload?.token) // infer auth
			};

			set(normalized); // push store update
			persist(normalized); // persist auth
		},
		clearAuth: () => {
			set(emptyAuth); // reset auth store
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY); // remove saved auth
			}
		},
		patchUser: (partialUser) => {
			update((state) => {
				const next = {
					...state, // retain token and flag
					user: {
						...(state.user ?? {}), // keep prior user
						...partialUser // merge new fields
					}
				};

				persist(next); // persist merged user
				return next; // return merged state
			});
		}
	};
};

export const authStore = createAuthStore(); // shared auth store
export const authStorageKey = STORAGE_KEY; // export key for api layer
