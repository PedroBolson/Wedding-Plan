import { createContext, useState, useEffect, type ReactNode } from 'react';

type ThemeContextType = {
    darkTheme: boolean;
    toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
    darkTheme: false,
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // Verificar preferência do sistema na montagem inicial
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Usar a preferência do sistema ou o valor salvo anteriormente
    const [darkTheme, setDarkTheme] = useState<boolean>(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme ? savedTheme === 'dark' : prefersDarkMode;
    });

    // Observar mudanças na preferência do sistema (API moderna)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            // Só atualiza se o usuário não tiver uma preferência salva
            if (!localStorage.getItem('theme')) {
                setDarkTheme(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    // Atualizar a classe do documento quando o modo escuro mudar
    useEffect(() => {
        if (darkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Salvar a preferência no localStorage
        localStorage.setItem('theme', darkTheme ? 'dark' : 'light');
    }, [darkTheme]);

    const toggleTheme = () => {
        setDarkTheme(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ darkTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};