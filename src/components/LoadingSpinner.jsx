import React from 'react';

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-navy-lighter p-8 rounded-2xl shadow-custom-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  </div>
);

export default LoadingSpinner;
