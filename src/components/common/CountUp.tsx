import { useState, useEffect } from 'react';

interface CountUpProps {
    end: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    className?: string;
}

const CountUp = ({ end, duration = 1000, decimals = 2, prefix = "", className = "" }: CountUpProps) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;
        const startValue = 0;

        const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

        const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easedProgress = easeOutQuart(progress);

            setCount(startValue + easedProgress * (end - startValue));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(updateCount);
            }
        };

        animationFrame = requestAnimationFrame(updateCount);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return (
        <span className={className}>
            {prefix}{count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
        </span>
    );
};

export default CountUp;