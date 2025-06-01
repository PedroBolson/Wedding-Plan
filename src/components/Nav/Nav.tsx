import React, { useState, useEffect, useContext } from 'react';
import AdminModal from '../AdminModal/AdminModal';
import { ThemeContext } from '../../contexts/ThemeContext';

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
    const { colors } = useContext(ThemeContext);
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
                    className="fixed top-4 right-4 z-[1100] w-12 h-12 border-none rounded-lg cursor-pointer flex justify-center items-center p-0 transition-all duration-300 hover:scale-110 shadow-lg"
                    style={{
                        backgroundColor: colors.surface,
                        boxShadow: `0 4px 20px ${colors.primary}40`
                    }}
                    onClick={toggleMobileMenu}
                    aria-label="Menu de navegação"
                >
                    <div className="relative w-6 h-6 flex flex-col justify-center items-center">
                        <span
                            className={`block w-6 h-0.5 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'}`}
                            style={{ backgroundColor: colors.primary }}
                        />
                        <span
                            className={`block w-6 h-0.5 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}
                            style={{ backgroundColor: colors.primary }}
                        />
                        <span
                            className={`block w-6 h-0.5 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1.5'}`}
                            style={{ backgroundColor: colors.primary }}
                        />
                    </div>
                </button>
            )}

            <nav
                className={`fixed top-0 left-0 bottom-0 w-64 shadow-lg overflow-y-auto transition-transform duration-300 z-[1000] ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-lg'}`}
                style={{
                    backgroundColor: colors.surface,
                    borderRight: `2px solid ${colors.accent}`
                }}
            >
                <div className="flex flex-col h-full p-0 m-0">
                    <div
                        className="px-4 py-6 text-center border-b"
                        style={{ borderColor: colors.accent }}
                    >
                        <h1
                            className="text-2xl font-bold m-0 bg-gradient-to-r bg-clip-text text-transparent"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                            }}
                        >
                            💕 {isAdmin ? 'Admin Casamento' : 'Nosso Casamento'} 💕
                        </h1>
                        <p
                            className="text-sm mt-2 italic"
                            style={{ color: colors.textSecondary }}
                        >
                            Planejando nosso dia especial
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <ul className="list-none p-3 m-0 flex flex-col gap-3">
                            {navOptions.map(option => (
                                <li key={option.id} className="w-full">
                                    {option.isAvailable ? (
                                        <button
                                            className={`block w-full px-4 py-3 rounded-lg font-medium text-left transition-all duration-200 border-none cursor-pointer transform hover:scale-105 hover:shadow-lg ${activeSection === option.id
                                                    ? 'shadow-md'
                                                    : 'hover:shadow-md'
                                                }`}
                                            style={{
                                                backgroundColor: activeSection === option.id ? colors.primary : colors.accent,
                                                color: activeSection === option.id ? 'white' : colors.text,
                                                boxShadow: activeSection === option.id
                                                    ? `0 4px 12px ${colors.primary}60`
                                                    : `0 2px 8px ${colors.primary}20`
                                            }}
                                            onClick={() => handleNavClick(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    ) : (
                                        <span
                                            className="relative block w-full px-4 py-3 rounded-lg font-medium text-left opacity-60 cursor-not-allowed"
                                            title="Em breve"
                                            style={{
                                                backgroundColor: colors.background,
                                                color: colors.textSecondary,
                                                border: `1px dashed ${colors.border}`
                                            }}
                                        >
                                            {option.label}
                                            <span
                                                className="absolute -top-2 -right-2 text-xs px-2 py-0.5 rounded-full font-bold text-white"
                                                style={{ backgroundColor: colors.warning }}
                                            >
                                                ✨ Em breve
                                            </span>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div
                        className="p-4 border-t flex flex-col gap-2"
                        style={{ borderColor: colors.accent }}
                    >
                        <div className="flex items-center gap-3 px-3 py-3">
                            <span
                                className="font-medium"
                                style={{ color: colors.text }}
                            >
                                {darkTheme ? '🌙 Modo Romântico Noturno' : '☀️ Modo Romântico Diurno'}
                            </span>
                            <div
                                className="relative w-16 h-8 cursor-pointer"
                                onClick={toggleTheme}
                                aria-label="Alternar tema"
                                role="switch"
                                aria-checked={darkTheme}
                            >
                                {/* Switch Background */}
                                <div
                                    className="absolute inset-0 rounded-full transition-all duration-500 ease-in-out shadow-inner"
                                    style={{
                                        background: darkTheme
                                            ? `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`
                                            : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                                        boxShadow: `inset 0 2px 4px ${colors.primary}30`
                                    }}
                                >
                                    {/* Hearts decoration */}
                                    {darkTheme ? (
                                        <>
                                            <div className="absolute top-1 left-2 text-xs">💕</div>
                                            <div className="absolute bottom-1 right-2 text-xs">✨</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="absolute top-1 right-2 text-xs">💖</div>
                                            <div className="absolute bottom-1 left-2 text-xs">🌸</div>
                                        </>
                                    )}
                                </div>

                                {/* Switch Circle with Icon */}
                                <div
                                    className={`absolute top-0.5 w-7 h-7 rounded-full transition-all duration-500 ease-in-out transform ${darkTheme ? 'translate-x-8' : 'translate-x-0.5'
                                        } flex items-center justify-center shadow-lg`}
                                    style={{
                                        backgroundColor: colors.surface,
                                        boxShadow: `0 2px 8px ${colors.primary}50`
                                    }}
                                >
                                    {darkTheme ? (
                                        <span className="text-sm">🌙</span>
                                    ) : (
                                        <span className="text-sm">☀️</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <button
                                className="flex items-center gap-3 px-3 py-3 rounded-lg border-none font-medium cursor-pointer transition-all duration-200 w-full justify-start hover:scale-105 hover:shadow-lg"
                                style={{
                                    backgroundColor: colors.accent,
                                    color: colors.text
                                }}
                                onClick={openAdminModal}
                            >
                                <span>👑 Gerenciar Usuários</span>
                            </button>
                        )}

                        <button
                            className="flex items-center gap-3 px-3 py-3 rounded-lg border-none font-medium cursor-pointer transition-all duration-200 w-full justify-start hover:scale-105 hover:shadow-lg"
                            style={{
                                backgroundColor: colors.accent,
                                color: colors.error
                            }}
                            onClick={onLogout}
                        >
                            <span>👋 Sair</span>
                        </button>
                    </div>
                </div>
            </nav>

            {mobileMenuOpen && (
                <div
                    className="fixed top-0 left-0 right-0 bottom-0 z-[999] block lg:hidden cursor-pointer"
                    style={{ backgroundColor: `${colors.primary}40` }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Modal para gerenciamento de admins */}
            {isAdmin && isAdminModalOpen && (
                <AdminModal onClose={closeAdminModal} />
            )}
        </>
    );
};

export default Nav;
