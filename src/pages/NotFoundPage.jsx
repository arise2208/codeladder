import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E5E7EB] max-w-md w-full text-center">
        <FileQuestion className="w-16 h-16 text-[#6B7280] mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-[#1E1F25] mb-2">Page Not Found</h1>
        <p className="text-[#6B7280] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate('/')} variant="primary" className="w-full">
          Return to Home
        </Button>
      </div>
    </div>
  );
}
