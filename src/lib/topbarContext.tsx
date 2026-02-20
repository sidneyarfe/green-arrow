'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TopbarContextType {
    actions: ReactNode;
    setActions: (actions: ReactNode) => void;
}

const TopbarContext = createContext<TopbarContextType>({
    actions: null,
    setActions: () => { },
});

export function TopbarProvider({ children }: { children: ReactNode }) {
    const [actions, setActions] = useState<ReactNode>(null);
    return (
        <TopbarContext.Provider value={{ actions, setActions }}>
            {children}
        </TopbarContext.Provider>
    );
}

export function useTopbarActions() {
    return useContext(TopbarContext);
}
