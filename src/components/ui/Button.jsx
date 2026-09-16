import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] font-semibold border border-[#ffa116]/30 shadow-xs',
  secondary: 'bg-[#282828] hover:bg-[#333333] text-[#eff2f6] border border-[#383838]',
  danger: 'bg-[#ef4743] hover:bg-[#d83a37] text-white border border-red-500/20',
  ghost: 'bg-transparent hover:bg-[#282828] text-[#8b949e] hover:text-[#eff2f6]',
  success: 'bg-[#2cbb5d] hover:bg-[#38cf6e] text-white',
  outline: 'border border-[#383838] bg-[#282828] hover:bg-[#333333] text-[#eff2f6]',
  accent: 'bg-[#ffa116] hover:bg-[#ffb84d] text-[#1a1a1a] font-semibold shadow-xs',
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
