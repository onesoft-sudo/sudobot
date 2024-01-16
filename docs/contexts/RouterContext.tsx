"use client";

import { usePathname } from "next/navigation";
import {
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

type RouterContextData = {
    isChanging: boolean;
    setIsChanging: Dispatch<SetStateAction<boolean>>;
};

const RouterContext = createContext<RouterContextData>({} as RouterContextData);

export function useRouterContext() {
    return useContext(RouterContext);
}

export function RouterContextProvider({ children }: PropsWithChildren) {
    const [isChanging, setIsChanging] = useState(false);
    const pathname = usePathname();

    useEffect(() => setIsChanging(false), [pathname]);

    return (
        <RouterContext.Provider value={{ isChanging, setIsChanging }}>
            {children}
        </RouterContext.Provider>
    );
}
