import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, isOpen, onClose, title, children, footer, className = '', maxWidth = 'max-w-md' }) {
  const isVisible = Boolean(open ?? isOpen);

  useEffect(() => {
    if (isVisible) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#282828] text-[#eff2f6] rounded-xl shadow-2xl border border-[#383838] w-full ${maxWidth} mx-4 max-h-[90vh] overflow-y-auto ${className}`}>
        <div className="flex items-center justify-between p-5 border-b border-[#383838]">
          <h3 className="text-base font-semibold text-[#eff2f6]">{title}</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#ffa116] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 p-5 border-t border-[#383838]">{footer}</div>}
      </div>
    </div>
  );
}
