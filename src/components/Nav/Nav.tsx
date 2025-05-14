import { useState } from 'react';
import './Nav.css';

interface NavOption {
    id: string;
    label: string;
    isAvailable: boolean;
}

type NavProps = {
    activeSection: string;
    onSectionChange: (sectionId: string) => void;
}

const Nav = ({ activeSection, onSectionChange }: NavProps) => {
    const [navOptions] = useState<NavOption[]>([
        {
            id: 'planning',
            label: 'Planejamento de Locais e Profissionais',
            isAvailable: true
        },
        {
            id: 'favorites',
            label: 'Locais Favoritos',
            isAvailable: true
        },
        {
            id: 'calendar',
            label: 'Calendário',
            isAvailable: true
        },
        {
            id: 'guests',
            label: 'Lista de Convidados',
            isAvailable: false
        },
        {
            id: 'budget',
            label: 'Orçamento',
            isAvailable: false
        }
    ]);

    const handleNavClick = (optionId: string) => {
        if (navOptions.find(opt => opt.id === optionId)?.isAvailable) {
            onSectionChange(optionId);
        }
    };

    return (
        <nav className="nav-pills">
            <div className="nav-container">
                <ul className="nav-list">
                    {navOptions.map(option => (
                        <li key={option.id} className="nav-item">
                            {option.isAvailable ? (
                                <button
                                    className={`nav-link ${activeSection === option.id ? "active" : ""}`}
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
        </nav>
    );
};

export default Nav;