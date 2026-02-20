import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label className="text-xs font-medium text-neutral-400">{label}</label>
                )}
                <input
                    ref={ref}
                    className={`input ${className}`}
                    {...props}
                />
                {hint && <p className="text-xs text-neutral-600">{hint}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, hint, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label className="text-xs font-medium text-neutral-400">{label}</label>
                )}
                <textarea
                    ref={ref}
                    className={`input resize-none ${className}`}
                    {...props}
                />
                {hint && <p className="text-xs text-neutral-600">{hint}</p>}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';
