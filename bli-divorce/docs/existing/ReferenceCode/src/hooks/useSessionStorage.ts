/**
 * @license
 * MIT License
 * Copyright (c) 2023 ui.dev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Store, retrieve, and synchronize data from the browser’s session storage.
 * Based on {@link https://github.com/uidotdev/usehooks/blob/90fbbb4cc085e74e50c36a62a5759a40c62bb98e/index.js#L1177}
 * @param key The key used to access the session storage value.
 * @param initialValue The initial value to use if there is no item in the session storage with the provided key.
 * @returns The current state of the value stored in session storage and a function to set the value.
 */
export default function useSessionStorage<T>(
    key: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const getSnapshot = () => getSessionStorageItem(key);

    const store = useSyncExternalStore(
        useSessionStorageSubscribe,
        getSnapshot,
        getSessionStorageServerSnapshot
    );

    const setState = useCallback(
        (v: T | ((prevState: T) => T)) => {
            try {
                const nextState =
                    typeof v === "function"
                        ? // @ts-ignore See: https://github.com/microsoft/TypeScript/issues/37663
                          v(JSON.parse(store ?? "null"))
                        : v;

                if (nextState === undefined || nextState === null) {
                    removeSessionStorageItem(key);
                } else {
                    setSessionStorageItem(key, nextState);
                }
            } catch (e) {
                console.warn(e);
            }
        },
        [key, store]
    );

    useEffect(() => {
        if (
            getSessionStorageItem(key) === null &&
            typeof initialValue !== "undefined"
        ) {
            setSessionStorageItem(key, initialValue);
        }
    }, [key, initialValue]);

    return [store ? JSON.parse(store) : initialValue, setState];
}

function dispatchStorageEvent(key: string, newValue: any) {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

const setSessionStorageItem = (key: string, value: any) => {
    const stringifiedValue = JSON.stringify(value);
    window.sessionStorage.setItem(key, stringifiedValue);
    dispatchStorageEvent(key, stringifiedValue);
};

const removeSessionStorageItem = (key: string) => {
    window.sessionStorage.removeItem(key);
    dispatchStorageEvent(key, null);
};

const getSessionStorageItem = (key: string) => {
    return window.sessionStorage.getItem(key);
};

const useSessionStorageSubscribe = (
    callback: (this: Window, ev: StorageEvent) => any
) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
};

const getSessionStorageServerSnapshot = () => {
    throw Error("useSessionStorage is a client-only hook");
};
