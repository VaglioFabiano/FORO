import React, { useState } from 'react';

// Header Component
const Header = () => {
  const handleImageError = (e) => {
    const target = e.target;
    const nextSibling = target.nextElementSibling;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
  };

  return (
    <header className="relative overflow-hidden">
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 animate-pulse"></div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/5 rounded-full blur-xl animate-bounce"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl animate-pulse"></div>
      
      <div className="relative z-10 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-10 transform hover:scale-105 transition-transform duration-300">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <img 
                src="/assets/logo.png" 
                alt="Logo Aula Studio" 
                className="relative mx-auto h-28 w-28 object-contain mb-6 bg-white/10 backdrop-blur-sm rounded-full p-3 border-2 border-white/20 shadow-2xl"
                onError={handleImageError}
              />
              <div className="hidden bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full w-28 h-28 mx-auto items-center justify-center shadow-2xl border-2 border-white/30">
                <span className="text-2xl font-bold text-white">AS</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6 mb-10">
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent animate-pulse">
              Aula Studio
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto rounded-full mb-6"></div>
            <p className="text-xl md:text-3xl font-light text-cyan-100 mb-8">
              Associazione del Terzo Settore
            </p>
          </div>
          
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light">
            Uno spazio dedicato allo studio e alla crescita personale, 
            dove la comunità si incontra per condividere conoscenza e obiettivi.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:from-cyan-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-xl">
              Scopri di più
            </button>
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
              Contattaci
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header