import { Location, useLocation } from "react-router-dom";

export interface LocationWithState<StateType extends unknown> extends Location {
    state: StateType;
}

export function useLocationWithState<StateType>() {
    return useLocation() as LocationWithState<StateType>;
}
