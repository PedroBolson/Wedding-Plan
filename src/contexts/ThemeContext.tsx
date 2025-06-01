import { createContext, useState, useEffect, type ReactNode } from 'react';

// Cores temáticas para casamento - Paleta neutra e elegante inspirada na natureza e eternidade
export const weddingColors = {
    light: {
        primary: 'rgb(133, 153, 122)', // sage green - verde sálvia que simboliza eternidade e crescimento
        primaryHover: 'rgb(115, 134, 103)', // sage green mais escuro para hover
        secondary: 'rgb(156, 163, 175)', // warm gray-400 - neutro e sofisticado
        accent: 'rgb(212, 194, 161)', // champagne dourado - elegância e celebração
        background: 'rgb(252, 251, 250)', // warm white - branco cremoso e acolhedor
        surface: 'rgb(255, 255, 255)', // branco puro para cartões
        surfaceHover: 'rgb(243, 244, 246)', // gray-100 - hover em superfícies
        text: 'rgb(55, 65, 81)', // gray-700 - legível e elegante
        textSecondary: 'rgb(107, 114, 128)', // gray-500 - texto secundário suave
        border: 'rgb(229, 231, 235)', // gray-200 - bordas delicadas
        success: 'rgb(16, 185, 129)', // emerald-500 - verde harmônico
        warning: 'rgb(245, 158, 11)', // amber-500 - dourado cálido
        error: 'rgb(239, 68, 68)', // red-500 - vermelho elegante
    },
    dark: {
        primary: 'rgb(212, 194, 161)', // champagne dourado - destaque no escuro
        primaryHover: 'rgb(191, 171, 135)', // champagne mais escuro
        secondary: 'rgb(133, 153, 122)', // sage green como secundária
        accent: 'rgb(156, 163, 175)', // warm gray como accent
        background: 'rgb(31, 41, 55)', // gray-800 - fundo escuro elegante
        surface: 'rgb(55, 65, 81)', // gray-700 - superfícies escuras
        surfaceHover: 'rgb(75, 85, 99)', // gray-600 - hover em superfícies escuras
        text: 'rgb(249, 250, 251)', // gray-50 - texto claro
        textSecondary: 'rgb(209, 213, 219)', // gray-300 - texto secundário
        border: 'rgb(75, 85, 99)', // gray-600 - bordas escuras
        success: 'rgb(52, 211, 153)', // emerald-400 - verde mais claro
        warning: 'rgb(251, 191, 36)', // amber-400 - dourado mais claro
        error: 'rgb(248, 113, 113)', // red-400 - vermelho mais suave
    }
};

type ThemeContextType = {
    darkTheme: boolean;
    toggleTheme: () => void;
    colors: typeof weddingColors.light;
};

export const ThemeContext = createContext<ThemeContextType>({
    darkTheme: false,
    toggleTheme: () => { },
    colors: weddingColors.light,
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
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        // Salvar a preferência no localStorage
        localStorage.setItem('theme', darkTheme ? 'dark' : 'light');
    }, [darkTheme]);

    const toggleTheme = () => {
        setDarkTheme(prev => !prev);
    };

    const currentColors = darkTheme ? weddingColors.dark : weddingColors.light;

    return (
        <ThemeContext.Provider value={{ darkTheme, toggleTheme, colors: currentColors }}>
            {children}
        </ThemeContext.Provider>
    );
};