import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-[#1E1F25]">{label}</label>}
    <input
      ref={ref}
      className={`input-field ${error ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
