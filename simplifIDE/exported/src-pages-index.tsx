// src/pages/index.tsx
import React from 'react';
import Link from 'next/link';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col justify-center items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-800">
          Welcome to Canvas
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          A flexible, modular application for managing your projects, 
          documents, code, and plans in one integrated workspace.
        </p>
        
        <div className="flex space-x-4">
          <Link 
            href="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/canvas"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            View Canvases
          </Link>
        </div>
      </main>
      
      <footer className="bg-gray-100 py-4 text-center">
        <p className="text-gray-600">
          © {new Date().getFullYear()} Canvas App. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;