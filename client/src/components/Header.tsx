import React from 'react';

const Header: React.FC = () => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'flex';
    }
  };

  return (
    <header className="relative overflow-hidden w-full min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
      
      {/* Floating animated elements */}
      <div className="absolute top-20 left-20 w-16 h-16 bg-white/10 rounded-full blur-sm animate-bounce"></div>
      <div className="absolute bottom-40 right-40 w-20 h-20 bg-white/10 rounded-full blur-sm animate-pulse"></div>
      <div className="absolute top-1/2 left-10 w-12 h-12 bg-purple-400/20 rounded-full blur-sm animate-ping"></div>
      <div className="absolute bottom-20 left-1/3 w-8 h-8 bg-blue-400/20 rounded-full blur-sm animate-bounce delay-300"></div>
      
      {/* Main content */}
      <div className="relative z-10 text-white h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo section */}
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <img 
                src="/assets/logo.png"
                alt="Logo Aula Studio" 
                className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto rounded-full shadow-2xl"
                onError={handleImageError}
              />
              <div className="hidden relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl">AS</span>
              </div>
            </div>
          </div>
          
          {/* Title section */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Aula Studio
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mb-4 rounded-full"></div>
            <p className="text-xl sm:text-2xl lg:text-3xl text-blue-200 font-light">
              Associazione del Terzo Settore
            </p>
          </div>
          
          {/* Description */}
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Uno spazio dedicato allo studio e alla crescita personale, 
            dove la comunità si incontra per condividere conoscenza e obiettivi.
          </p>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
              <span className="relative z-10">Scopri di più</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button className="group relative px-8 py-4 bg-transparent border-2 border-white/30 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/50 w-full sm:w-auto">
              <span className="relative z-10">Contattaci</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 left-3/4 w-1 h-1 bg-blue-400/60 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-pink-400/50 rounded-full animate-ping delay-500"></div>
      </div>
    </header>
  );
};

export default Header;