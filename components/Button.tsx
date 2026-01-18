import type { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from 'react';

interface ButtonProps
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  children: ReactNode;
  variant?: 'cyan' | 'pink' | 'yellow' | 'white';
  size?: 'sm' | 'md' | 'lg';
}

const Button = ({
  children,
  variant = 'pink',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles =
    'font-mono font-bold uppercase border-2 transition-all duration-200';

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantStyles = {
    cyan: 'bg-brutalist-cyan text-black border-white shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none',
    pink: 'bg-brutalist-pink text-black border-white shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none',
    yellow:
      'bg-brutalist-yellow text-black border-white shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none',
    white:
      'bg-white text-black border-black shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
