import { useState, useEffect } from 'react';
import { BACKEND_API } from '../config/api';

export const useOllamaStatus = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${BACKEND_API.BASE_URL}${BACKEND_API.ENDPOINTS.OLLAMA_MODELS}`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                if (!response.ok) {
                    setIsConnected(false);
                    return;
                }
                const data = await response.json();
                setIsConnected(Boolean(data?.success && data?.ollama_online));
            } catch {
                setIsConnected(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, []);

    return { isConnected, isLoading };
};
