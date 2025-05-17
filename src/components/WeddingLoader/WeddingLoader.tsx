import React from 'react';
import './WeddingLoader.css';

type WeddingLoaderProps = {
    message?: string;
    size?: 'small' | 'medium' | 'large';
};

const WeddingLoader: React.FC<WeddingLoaderProps> = ({
    message = 'Para sempre...',
    size = 'medium',
}) => {
    return (
        <div className={`svg-loader svg-loader--${size}`}>
            <img
                src="/loader.svg"
                alt="Loading..."
                className="svg-loader__image"
                draggable={false}
            />
            {message && <p className="svg-loader__message">{message}</p>}
        </div>
    );
};

export default WeddingLoader;