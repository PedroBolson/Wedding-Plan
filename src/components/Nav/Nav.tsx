import React, { useState, useEffect } from 'react';
import AdminModal from '../AdminModal/AdminModal';

interface NavOption {
    id: string;
    label: string;
    isAvailable: boolean;
}

type NavProps = {
    activeSection: string;
    onSectionChange: (sectionId: string) => void;
    onLogout: () => void;
    darkTheme: boolean;
    toggleTheme: () => void;
    isAdmin: boolean; // Nova propriedade para verificar se é admin
};

const Nav: React.FC<NavProps> = ({
    activeSection,
    onSectionChange,
    onLogout,
    darkTheme,
    toggleTheme,
    isAdmin // Nova propriedade
}) => {
    const [navOptions] = useState<NavOption[]>([
        { id: 'planning', label: 'Planejamento de Locais e Profissionais', isAvailable: true },
        { id: 'budget', label: 'Orçamento', isAvailable: true },
        { id: 'favorites', label: 'Locais Favoritos', isAvailable: true },
        { id: 'chart', label: 'Gráfico de Orçamento', isAvailable: true },
        { id: 'calendar', label: 'Calendário', isAvailable: true },
        { id: 'guests', label: 'Lista de Convidados', isAvailable: false }
    ]);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false); // Novo state para controlar o modal

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            if (window.innerWidth >= 1026) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNavClick = (optionId: string) => {
        if (navOptions.find(opt => opt.id === optionId)?.isAvailable) {
            onSectionChange(optionId);
            if (windowWidth < 768) {
                setMobileMenuOpen(false);
            }
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(prev => !prev);
    };

    const openAdminModal = () => {
        setIsAdminModalOpen(true);
    };

    const closeAdminModal = () => {
        setIsAdminModalOpen(false);
    };

    return (
        <>
            {windowWidth < 1051 && (
                <button
                    className={`fixed top-4 right-4 z-[1100] w-12 h-12 border-none bg-transparent rounded-lg cursor-pointer flex justify-center items-center p-0 transition-all duration-300 ${mobileMenuOpen ? 'mobile-open' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Menu de navegação"
                >
                    <span className={`relative w-6 h-0.5 bg-gray-900 dark:bg-gray-100 transition-all duration-300 ${mobileMenuOpen ? 'bg-transparent rotate-180' : ''} before:content-[''] before:absolute before:w-6 before:h-0.5 before:bg-gray-900 before:dark:bg-gray-100 before:transition-all before:duration-300 before:left-0 ${mobileMenuOpen ? 'before:rotate-45 before:translate-y-0 before:top-0' : 'before:-top-1.5'} after:content-[''] after:absolute after:w-6 after:h-0.5 after:bg-gray-900 after:dark:bg-gray-100 after:transition-all after:duration-300 after:left-0 ${mobileMenuOpen ? 'after:-rotate-45 after:translate-y-0 after:top-0' : 'after:top-1.5'}`} />
                </button>
            )}

            <nav className={`fixed top-0 left-0 bottom-0 w-64 bg-gray-50 dark:bg-gray-800 shadow-lg overflow-y-auto transition-transform duration-300 z-[1000] ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-lg'}`}>
                <div className="flex flex-col h-full p-0 m-0">
                    <div className="px-4 py-6 text-center border-b border-gray-200 dark:border-gray-700">
                        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 m-0">
                            {isAdmin ? 'Admin Casamento' : 'Casamento'}
                        </h1>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <ul className="list-none p-3 m-0 flex flex-col gap-3">
                            {navOptions.map(option => (
                                <li key={option.id} className="w-full">
                                    {option.isAvailable ? (
                                        <button
                                            className={`block w-full px-4 py-3 rounded-lg font-medium text-left transition-all duration-200 border-none cursor-pointer ${activeSection === option.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-600 hover:text-white hover:-translate-y-0.5'
                                                }`}
                                            onClick={() => handleNavClick(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    ) : (
                                        <span className="relative block w-full px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-medium text-left opacity-60 cursor-not-allowed" title="Em breve">
                                            {option.label}
                                            <span className="absolute -top-2 -right-2 bg-yellow-500 text-gray-900 text-xs px-2 py-0.5 rounded-full font-bold">
                                                Em breve
                                            </span>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                        <div className="flex items-center gap-3 px-3 py-3">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {darkTheme ? 'Modo Escuro' : 'Modo Claro'}
                            </span>
                            <div
                                className="relative w-16 h-8 cursor-pointer"
                                onClick={toggleTheme}
                                aria-label="Alternar tema"
                                role="switch"
                                aria-checked={darkTheme}
                            >
                                {/* Switch Background */}
                                <div className={`absolute inset-0 rounded-full transition-all duration-500 ease-in-out ${darkTheme
                                    ? 'bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 shadow-lg'
                                    : 'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 shadow-md'
                                    }`}>
                                    {/* Stars for dark mode */}
                                    {darkTheme && (
                                        <>
                                            <div className="absolute top-1 left-2 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                                            <div className="absolute top-2 right-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                            <div className="absolute bottom-1.5 left-4 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                                            <div className="absolute top-1.5 right-5 w-1 h-1 bg-yellow-200 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                                        </>
                                    )}

                                    {/* Clouds for light mode */}
                                    {!darkTheme && (
                                        <>
                                            <div className="absolute top-1 right-2 w-2 h-1 bg-white rounded-full opacity-80 animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
                                            <div className="absolute bottom-1 right-4 w-1.5 h-0.5 bg-white rounded-full opacity-70 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                                            <div className="absolute top-2 right-6 w-1 h-0.5 bg-white rounded-full opacity-60 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
                                        </>
                                    )}
                                </div>

                                {/* Switch Circle with Icon */}
                                <div className={`absolute top-0.5 w-7 h-7 rounded-full transition-all duration-500 ease-in-out transform ${darkTheme
                                    ? 'translate-x-8 bg-gradient-to-br from-gray-100 to-gray-300 shadow-md'
                                    : 'translate-x-0.5 bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-lg'
                                    } flex items-center justify-center`}>
                                    {darkTheme ? (
                                        // Moon Icon
                                        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                                        </svg>
                                    ) : (
                                        // Sun Icon
                                        <svg className="w-4 h-4 text-yellow-800 animate-spin" viewBox="0 0 24 24" fill="currentColor" style={{ animationDuration: '8s' }}>
                                            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <button
                                className="flex items-center gap-3 px-3 py-3 rounded-lg border-none bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium cursor-pointer transition-all duration-200 w-full justify-start hover:bg-gray-300 dark:hover:bg-gray-600"
                                onClick={openAdminModal}
                            >
                                <span>Gerenciar Usuários</span>
                            </button>
                        )}

                        <button
                            className="flex items-center gap-3 px-3 py-3 rounded-lg border-none bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400 font-medium cursor-pointer transition-all duration-200 w-full justify-start hover:bg-gray-300 dark:hover:bg-gray-600"
                            onClick={onLogout}
                        >
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </nav>

            {mobileMenuOpen && (
                <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-[999] block lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Modal para gerenciamento de admins */}
            {isAdmin && isAdminModalOpen && (
                <AdminModal onClose={closeAdminModal} />
            )}
        </>
    );
};

export default Nav;
