import React from 'react';

type WeddingLoaderProps = {
    message?: string;
    size?: 'small' | 'medium' | 'large';
};

const WeddingLoader: React.FC<WeddingLoaderProps> = ({
    message = 'Para sempre...',
    size = 'medium',
}) => {
    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16'
    };

    const containerSizeClasses = {
        small: 'gap-2',
        medium: 'gap-3',
        large: 'gap-4'
    };

    return (
        <div className={`flex flex-col bg-white dark:bg-gray-900 items-center justify-center ${containerSizeClasses[size]}`}>
            <img
                src="/loader.svg"
                alt="Loading..."
                className={`${sizeClasses[size]}`}
                draggable={false}
            />
            {message && (
                <p className="text-gray-600 dark:text-gray-400 text-center font-medium">
                    {message}
                </p>
            )}
        </div>
    );
};

export default WeddingLoader;