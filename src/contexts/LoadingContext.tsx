// src/contexts/LoadingContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import WeddingLoader from '../components/WeddingLoader/WeddingLoader';

interface LoadingContextProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    setLoadingMessage: (message: string) => void;
    showLoadingForDuration: (message: string, durationMs: number) => void; // Nova função
}

const LoadingContext = createContext<LoadingContextProps | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoadingState] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Carregando');
    const [minDisplayTimeEnd, setMinDisplayTimeEnd] = useState<number | null>(null);

    // Função para garantir que o loading fique visível por pelo menos X milissegundos
    const setIsLoading = (loading: boolean) => {
        if (loading) {
            setIsLoadingState(true);
            setMinDisplayTimeEnd(Date.now() + 1000);
        } else {
            // Verifica se o tempo mínimo já passou
            if (!minDisplayTimeEnd || Date.now() >= minDisplayTimeEnd) {
                setIsLoadingState(false);
            } else {
                // Agenda para esconder após o tempo mínimo
                const remainingTime = minDisplayTimeEnd - Date.now();
                setTimeout(() => setIsLoadingState(false), remainingTime);
            }
        }
    };

    // Função para mostrar o loader por uma duração específica
    const showLoadingForDuration = (message: string, durationMs: number) => {
        setLoadingMessage(message);
        setIsLoadingState(true);
        setMinDisplayTimeEnd(Date.now() + durationMs);

        setTimeout(() => {
            setIsLoadingState(false);
        }, durationMs);
    };

    return (
        <LoadingContext.Provider value={{
            isLoading,
            setIsLoading,
            setLoadingMessage,
            showLoadingForDuration
        }}>
            {isLoading && (
                <div className="global-loader-overlay">
                    <WeddingLoader message={loadingMessage} size="medium" />
                </div>
            )}
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (context === undefined) {
        throw new Error('useLoading deve ser usado dentro de um LoadingProvider');
    }
    return context;
};