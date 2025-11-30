import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | '';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-red-500' : 'bg-green-600';
  return (
    <div className={`fixed top-4 right-4 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-bounce-in`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 font-bold hover:text-gray-200 focus:outline-none">×</button>
    </div>
  );
};