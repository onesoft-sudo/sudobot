import { useRef, useState } from "react";

export default function useDebouncedState<T>(data?: T, delay = 1500) {
    const [state, setState] = useState<T>(data as T);
    const [queued, setQueued] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>();

    const setDebouncedState = (newData: T) => {
        if (!queued) {
            setQueued(true);
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }

        timeoutRef.current = setTimeout(() => {
            setState(newData);
            setQueued(false);
        }, delay);
    };

    return [state as T, queued, setDebouncedState, setState] as const;
}
