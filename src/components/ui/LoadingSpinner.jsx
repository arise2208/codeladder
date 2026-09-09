import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen = false, size = 24, text = 'Loading...' }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#6C5CE7]" />
          <p className="text-sm text-[#6B7280]">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={size} className="animate-spin text-[#6C5CE7]" />
        <p className="text-sm text-[#6B7280]">{text}</p>
      </div>
    </div>
  );
}
