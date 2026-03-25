import axios from "axios";

export const AUTH_HEADER_PREFIX = "Token";
export const AUTH_TOKEN_KEY = "_token";
export const API_HOST = "/";

const api = axios.create({
    baseURL: API_HOST,
});
api.interceptors.request.use(function (config) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `${AUTH_HEADER_PREFIX} ${token}`;
    }
    return config;
});
api.interceptors.request.use(function (config) {
    const url = new URL(config.url ?? "", window.location.origin);
    if (!url.pathname.endsWith("/")) {
        console.warn(
            `Requested path ("${config.url}") does not end in a trailing slash (/). One was appended.`
        );
        url.pathname += "/";
    }
    config.url = url.toString();

    return config;
});

export default api;
