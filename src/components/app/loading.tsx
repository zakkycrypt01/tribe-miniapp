
"use client";

import { useEffect, useState } from 'react';

export function LoadingScreen() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
            <div className="animate-pulse">
                <img src='https://i.postimg.cc/9wYkyYDx/Tribe-Logo-Edit.png' style={{ width: '150px' }} alt='Tribe-Logo-Edit'/>
            </div>
        </div>
    );
}
