import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white',
  secondary: 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#1E1F25]',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-[#F3F4F6] text-[#6B7280]',
  success: 'bg-[#00B894] hover:bg-[#00A381] text-white',
  outline: 'border border-[#E5E7EB] bg-white hover:bg-[#F8F9FB] text-[#1E1F25]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
