import React, { useState, useEffect } from 'react';
import './Nav.css';
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
                    className={`nav-mobile-toggle ${mobileMenuOpen ? 'mobile-open' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Menu de navegação"
                >
                    <span className="hamburger-icon" />
                </button>
            )}

            <nav className={`nav-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="nav-container">
                    <div className="nav-logo">
                        <h1>{isAdmin ? 'Admin Casamento' : 'Casamento'}</h1>
                    </div>

                    <div className="nav-content">
                        <ul className="nav-list">
                            {navOptions.map(option => (
                                <li key={option.id} className="nav-item">
                                    {option.isAvailable ? (
                                        <button
                                            className={`nav-link ${activeSection === option.id ? 'active' : ''}`}
                                            onClick={() => handleNavClick(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    ) : (
                                        <span className="nav-link disabled" title="Em breve">
                                            {option.label}
                                            <span className="coming-soon-badge">Em breve</span>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="nav-footer">
                        <button className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema">
                            {darkTheme ?
                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="32" height="32" viewBox="0 0 64 64">
                                    <radialGradient id="RbJnniKIjDo23wwJ9NBMca_119011_gr1" cx="32" cy="32" r="31.016" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
                                        <stop offset="0" stopColor="#afeeff"></stop>
                                        <stop offset=".193" stopColor="#bbf1ff"></stop>
                                        <stop offset=".703" stopColor="#d7f8ff"></stop>
                                        <stop offset="1" stopColor="#e1faff"></stop>
                                    </radialGradient>
                                    <path fill="url(#RbJnniKIjDo23wwJ9NBMca_119011_gr1)" d="M59,20h1.5c2.168,0,3.892-1.998,3.422-4.243C63.58,14.122,62.056,13,60.385,13L56,13 c-1.105,0-2-0.895-2-2c0-1.105,0.895-2,2-2h0.385c1.67,0,3.195-1.122,3.537-2.757C60.392,3.998,58.668,2,56.5,2H34.006H32.5h-26 C4.575,2,3,3.575,3,5.5S4.575,9,6.5,9H8c1.105,0,2,0.895,2,2c0,1.105-0.895,2-2,2l-3.385,0c-1.67,0-3.195,1.122-3.537,2.757 C0.608,18.002,2.332,20,4.5,20H18v13L3.615,33c-1.67,0-3.195,1.122-3.537,2.757C-0.392,38.002,1.332,40,3.5,40H5 c1.105,0,2,0.895,2,2c0,1.105-0.895,2-2,2H4.5c-2.168,0-3.892,1.998-3.422,4.243C1.42,49.878,2.945,51,4.615,51H8 c1.105,0,2,0.895,2,2c0,1.105-0.895,2-2,2l-1.385,0c-1.67,0-3.195,1.122-3.537,2.757C2.608,60.002,4.332,62,6.5,62h24.494H32.5h24 c1.925,0,3.5-1.575,3.5-3.5S58.425,55,56.5,55H56c-1.105,0-2-0.895-2-2c0-1.105,0.895-2,2-2h4.385c1.67,0,3.195-1.122,3.537-2.757 C64.392,45.998,62.668,44,60.5,44H47V31h12.385c1.67,0,3.195-1.122,3.537-2.757C63.392,25.998,61.668,24,59.5,24H59 c-1.105,0-2-0.895-2-2C57,20.895,57.895,20,59,20z"></path><linearGradient id="RbJnniKIjDo23wwJ9NBMcb_119011_gr2" x1="32" x2="32" y1="52" y2="12" gradientUnits="userSpaceOnUse" spreadMethod="reflect"><stop offset="0" stop-color="#ff9757"></stop><stop offset="1" stop-color="#ffb65b"></stop><stop offset="1" stop-color="#ffb65b"></stop></linearGradient><path fill="url(#RbJnniKIjDo23wwJ9NBMcb_119011_gr2)" d="M12,12h40v40H12V12z"></path><linearGradient id="RbJnniKIjDo23wwJ9NBMcc_119011_gr3" x1="32" x2="32" y1="60" y2="4" gradientUnits="userSpaceOnUse" spreadMethod="reflect"><stop offset="0" stop-color="#ff9757"></stop><stop offset="1" stop-color="#ffb65b"></stop><stop offset="1" stop-color="#ffb65b"></stop></linearGradient><path fill="url(#RbJnniKIjDo23wwJ9NBMcc_119011_gr3)" d="M4,32L32,4l28,28L32,60L4,32z"></path><linearGradient id="RbJnniKIjDo23wwJ9NBMcd_119011_gr4" x1="32" x2="32" y1="56.713" y2="22.713" gradientUnits="userSpaceOnUse" spreadMethod="reflect"><stop offset="0" stop-color="#feaa53"></stop><stop offset=".612" stop-color="#ffcd49"></stop><stop offset="1" stop-color="#ffde44"></stop></linearGradient><path fill="url(#RbJnniKIjDo23wwJ9NBMcd_119011_gr4)" d="M15,32c0,9.393,7.607,17,17,17c9.387,0,17-7.607,17-17s-7.613-17-17-17 C22.607,15,15,22.607,15,32"></path>
                                </svg>
                                :
                                <img width="32" height="32" src="https://img.icons8.com/color/48/moon.png" alt="moon" />
                            }
                            <span>{darkTheme ? 'Modo Claro' : 'Modo Escuro'}</span>
                        </button>

                        {isAdmin && (
                            <button className="admin-button" onClick={openAdminModal}>
                                <span>Gerenciar Usuários</span>
                            </button>
                        )}

                        <button className="logout-button" onClick={onLogout}>
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </nav>

            {mobileMenuOpen && (
                <div className="nav-backdrop" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Modal para gerenciamento de admins */}
            {isAdmin && isAdminModalOpen && (
                <AdminModal onClose={closeAdminModal} />
            )}
        </>
    );
};

export default Nav;
