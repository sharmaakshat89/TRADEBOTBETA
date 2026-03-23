import axios from 'axios'; // axios client

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'; // backend base url

const authStorageKey = 'yukti-auth'; // auth localStorage key

export const api = axios.create({
	baseURL: API_URL, // prefix every request
	timeout: 15000, // fail slow requests
	headers: {
		'Content-Type': 'application/json' // send JSON bodies
	}
});

const getStoredToken = () => {
	if (typeof window === 'undefined') return null; // skip SSR

	try {
		const raw = localStorage.getItem(authStorageKey); // read persisted auth
		if (!raw) return null; // nothing saved

		const parsed = JSON.parse(raw); // parse saved auth state
		return parsed?.token ?? null; // return token safely
	} catch (error) {
		console.error('[api] token parse failed', error); // debug storage issue
		return null; // fallback without token
	}
};

api.interceptors.request.use(
	(config) => {
		const token = getStoredToken(); // read JWT before each request

		if (token) {
			const value = `Bearer ${token}`; // backend expects bearer token
			config.headers.Authorization = value; // standard auth header
			config.headers.authorization = value; // lowercase compatibility
			config.headers.authorisation = value; // backend typo compatibility
		}

		return config; // continue request
	},
	(error) => Promise.reject(error) // propagate request setup error
);

api.interceptors.response.use(
	(response) => response, // pass through success responses
	(error) => {
		const status = error?.response?.status; // extract status safely

		if (typeof window !== 'undefined' && status === 401) {
			localStorage.removeItem(authStorageKey); // clear invalid auth
		}

		return Promise.reject(error); // let caller handle message
	}
);

export default api; // default export for convenience
