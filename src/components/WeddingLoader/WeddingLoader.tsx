import React, { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

type WeddingLoaderProps = {
    message?: string;
    size?: 'small' | 'medium' | 'large';
};

const WeddingLoader: React.FC<WeddingLoaderProps> = ({
    message = 'Para sempre...',
    size = 'medium',
}) => {
    const { colors } = useContext(ThemeContext);

    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16'
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            gap: size === 'small' ? '0.5rem' : size === 'medium' ? '0.75rem' : '1rem'
        }}>
            <img
                src="/loader.svg"
                alt="Loading..."
                className={`${sizeClasses[size]}`}
                draggable={false}
            />
            {message && (
                <p style={{
                    color: colors.textSecondary,
                    textAlign: 'center',
                    fontWeight: '500'
                }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default WeddingLoader;