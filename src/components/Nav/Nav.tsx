import React, { useState, useEffect, useContext } from 'react';
import AdminModal from '../AdminModal/AdminModal';
import { ThemeContext } from '../../contexts/ThemeContext';
import {
    Heart,
    LogOut,
    Crown,
    Sun,
    Moon,
    Menu,
    Cloud,
    Star,
    Sparkles
} from 'lucide-react';

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
    isAdmin: boolean;
    hasChosenVenue: boolean; // habilita custos definitivos
};

const Nav: React.FC<NavProps> = ({
    activeSection,
    onSectionChange,
    onLogout,
    darkTheme,
    toggleTheme,
    isAdmin,
    hasChosenVenue
}) => {
    const { colors } = useContext(ThemeContext);
    const [navOptions] = useState<NavOption[]>([
        { id: 'planning', label: 'Planejamento de Locais e Profissionais', isAvailable: true },
        { id: 'budget', label: 'Previsão de Custos', isAvailable: true },
        { id: 'favorites', label: 'Locais Favoritos', isAvailable: true },
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
        const dynamicOptions: NavOption[] = hasChosenVenue ? [{ id: 'finalCosts', label: 'Custos Definitivos', isAvailable: true }] : [];
        const all = [...navOptions, ...dynamicOptions];
        if (all.find(opt => opt.id === optionId)?.isAvailable) {
            onSectionChange(optionId);
            if (windowWidth < 768) setMobileMenuOpen(false);
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
                        {mobileMenuOpen ? (
                            // X icon when menu is open
                            <>
                                <span
                                    className="block w-6 h-0.5 rotate-45 translate-y-0 transition-all duration-300"
                                    style={{ backgroundColor: colors.primary }}
                                />
                                <span
                                    className="block w-6 h-0.5 -rotate-45 -translate-y-0.5 transition-all duration-300"
                                    style={{ backgroundColor: colors.primary }}
                                />
                            </>
                        ) : (
                            // Menu icon when closed
                            <Menu size={20} color={colors.primary} />
                        )}
                    </div>
                </button>
            )}

            <nav
                className={`fixed top-0 left-0 bottom-0 w-64 shadow-lg overflow-y-auto transition-transform duration-300 z-[1000] ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                    } ${windowWidth >= 1051 ? 'translate-x-0 lg:shadow-lg' : ''}`}
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
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Heart
                                size={windowWidth < 768 ? 20 : 24}
                                fill={colors.primary}
                                color={colors.primary}
                                className="animate-pulse"
                            />
                            <h1
                                className={`${windowWidth < 768 ? 'text-lg' : 'text-2xl'} font-bold m-0 bg-gradient-to-r bg-clip-text text-transparent`}
                                style={{
                                    backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                }}
                            >
                                {isAdmin ? 'Admin Casamento' : 'Nosso Casamento'}
                            </h1>
                            <Heart
                                size={windowWidth < 768 ? 20 : 24}
                                fill={colors.primary}
                                color={colors.primary}
                                className="animate-pulse"
                            />
                        </div>
                        <p
                            className={`${windowWidth < 768 ? 'text-xs' : 'text-sm'} mt-2 italic`}
                            style={{ color: colors.textSecondary }}
                        >
                            Planejando nosso dia especial
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <ul className="list-none p-3 m-0 flex flex-col gap-3">
                            {[...navOptions, ...(hasChosenVenue ? [{ id: 'finalCosts', label: 'Custos Definitivos', isAvailable: true }] : [])].map(option => (
                                <li key={option.id} className="w-full">
                                    {option.isAvailable ? (
                                        <button
                                            className={`block w-full px-3 py-2 rounded-lg font-medium text-left transition-all duration-200 border-none cursor-pointer transform hover:scale-105 hover:shadow-lg ${activeSection === option.id ? 'shadow-md' : 'hover:shadow-md'
                                                }`}
                                            style={{
                                                backgroundColor: activeSection === option.id ? colors.primary : colors.accent,
                                                color: activeSection === option.id ? 'white' : colors.text,
                                                boxShadow: activeSection === option.id
                                                    ? `0 4px 12px ${colors.primary}60`
                                                    : `0 2px 8px ${colors.primary}20`,
                                                fontSize: windowWidth < 768 ? '0.875rem' : '1rem',
                                                lineHeight: windowWidth < 768 ? '1.25' : '1.5'
                                            }}
                                            onClick={() => handleNavClick(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    ) : (
                                        <span
                                            className="relative block w-full px-3 py-2 rounded-lg font-medium text-left opacity-60 cursor-not-allowed"
                                            title="Em breve"
                                            style={{
                                                backgroundColor: colors.background,
                                                color: colors.textSecondary,
                                                border: `1px dashed ${colors.border}`,
                                                fontSize: windowWidth < 768 ? '0.875rem' : '1rem',
                                                lineHeight: windowWidth < 768 ? '1.25' : '1.5'
                                            }}
                                        >
                                            {option.label}
                                            <span
                                                className="absolute -top-2 -right-2 text-xs px-2 py-0.5 rounded-full font-bold text-white flex items-center gap-1"
                                                style={{ backgroundColor: colors.warning }}
                                            >
                                                <Sparkles className="w-3 h-3" /> Em breve
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
                                {darkTheme ? 'Modo escuro' : 'Modo claro'}
                            </span>
                            <div
                                className="relative w-16 h-8 cursor-pointer overflow-hidden"
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
                                            ? `linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)`
                                            : `linear-gradient(135deg, #87CEEB, #98D8E8, #B6E5FC)`,
                                        boxShadow: `inset 0 2px 4px ${colors.primary}30`
                                    }}
                                >
                                    {/* Animated background elements */}
                                    {darkTheme ? (
                                        // Night mode: Twinkling stars
                                        <>
                                            <Star
                                                size={4}
                                                className="absolute top-1 left-1 text-white animate-pulse"
                                                fill="currentColor"
                                                style={{ animationDelay: '0s', animationDuration: '2s' }}
                                            />
                                            <Star
                                                size={3}
                                                className="absolute top-2 right-3 text-yellow-200 animate-pulse"
                                                fill="currentColor"
                                                style={{ animationDelay: '0.5s', animationDuration: '1.5s' }}
                                            />
                                            <Star
                                                size={3}
                                                className="absolute bottom-1 left-3 text-blue-200 animate-pulse"
                                                fill="currentColor"
                                                style={{ animationDelay: '1s', animationDuration: '2.5s' }}
                                            />
                                            <Star
                                                size={2}
                                                className="absolute top-3 left-5 text-purple-200 animate-pulse"
                                                fill="currentColor"
                                                style={{ animationDelay: '1.5s', animationDuration: '1.8s' }}
                                            />
                                            <Star
                                                size={3}
                                                className="absolute bottom-2 right-1 text-pink-200 animate-pulse"
                                                fill="currentColor"
                                                style={{ animationDelay: '2s', animationDuration: '2.2s' }}
                                            />
                                            {/* Shooting star effect */}
                                            <div
                                                className="absolute top-1 left-0 w-1 h-px bg-white opacity-80 animate-ping"
                                                style={{
                                                    animationDelay: '3s',
                                                    animationDuration: '4s',
                                                    background: 'linear-gradient(90deg, transparent, white, transparent)'
                                                }}
                                            />
                                        </>
                                    ) : (
                                        // Day mode: Moving clouds
                                        <>
                                            <Cloud
                                                size={8}
                                                className="absolute top-0.5 left-1 text-white opacity-60 animate-bounce"
                                                fill="currentColor"
                                                style={{ animationDelay: '0s', animationDuration: '3s' }}
                                            />
                                            <Cloud
                                                size={6}
                                                className="absolute top-1 right-2 text-white opacity-50 animate-bounce"
                                                fill="currentColor"
                                                style={{ animationDelay: '1s', animationDuration: '4s' }}
                                            />
                                            <Cloud
                                                size={7}
                                                className="absolute bottom-0.5 left-4 text-white opacity-40 animate-bounce"
                                                fill="currentColor"
                                                style={{ animationDelay: '2s', animationDuration: '3.5s' }}
                                            />
                                            {/* Floating particles for day mode */}
                                            <div
                                                className="absolute top-2 right-4 w-1 h-1 bg-yellow-200 rounded-full opacity-70 animate-ping"
                                                style={{ animationDelay: '0.5s', animationDuration: '2s' }}
                                            />
                                            <div
                                                className="absolute bottom-1 left-6 w-0.5 h-0.5 bg-yellow-300 rounded-full opacity-60 animate-ping"
                                                style={{ animationDelay: '1.5s', animationDuration: '2.5s' }}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Switch Circle with Icon */}
                                <div
                                    className={`absolute top-0.5 w-7 h-7 rounded-full transition-all duration-500 ease-in-out transform ${darkTheme ? 'translate-x-8' : 'translate-x-0.5'
                                        } flex items-center justify-center shadow-lg z-10`}
                                    style={{
                                        backgroundColor: colors.surface,
                                        boxShadow: darkTheme
                                            ? `0 0 15px rgba(147, 197, 253, 0.5), 0 2px 8px ${colors.primary}50`
                                            : `0 0 15px rgba(251, 191, 36, 0.6), 0 2px 8px ${colors.primary}50`
                                    }}
                                >
                                    {darkTheme ? (
                                        <Moon
                                            size={16}
                                            className="text-blue-200 drop-shadow-sm"
                                            style={{
                                                filter: 'drop-shadow(0 0 4px rgba(147, 197, 253, 0.7))'
                                            }}
                                        />
                                    ) : (
                                        <Sun
                                            size={16}
                                            className="text-yellow-500 animate-spin drop-shadow-sm"
                                            style={{
                                                animationDuration: '8s',
                                                filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))'
                                            }}
                                        />
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
                                <Crown size={18} className="text-yellow-500" />
                                <span>Gerenciar Usuários</span>
                            </button>
                        )}

                        <button
                            className="flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-transparent font-medium cursor-pointer transition-all duration-200 w-full justify-start hover:scale-105 hover:shadow-lg hover:border-red-500"
                            style={{
                                backgroundColor: colors.accent,
                                color: colors.text
                            }}
                            onClick={onLogout}
                        >
                            <LogOut size={18} className="text-red-500" />
                            <span>Sair</span>
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
