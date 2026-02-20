import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    noPad?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ noPad, className = '', children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`card ${noPad ? '!p-0' : ''} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={`flex items-center justify-between pb-4 mb-4 border-b border-neutral-800 ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`text-sm font-semibold text-white ${className}`} {...props}>
        {children}
    </h3>
);
