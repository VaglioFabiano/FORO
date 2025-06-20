import React from 'react'

const Header: React.FC = () => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const nextSibling = target.nextElementSibling as HTMLElement;
    target.style.display = 'none';
    if (nextSibling) {
      nextSibling.style.display = 'block';
    }
  };

  return (
    <header className="text-white py-16 px-6" style={{background: 'linear-gradient(to right, rgb(12, 73, 91), rgb(15, 85, 105)'}}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <img 
            src="/src/assets/logo.png" 
            alt="Logo Associazione" 
            className="mx-auto h-24 w-24 object-contain mb-4 bg-white/10 rounded-full p-2"
            onError={handleImageError}
          />
          <div className="hidden bg-white/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold">LOGO</span>
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Aula Studio
        </h1>
        <p className="text-xl md:text-2xl opacity-90 mb-8">
          Associazione del Terzo Settore
        </p>
        <p className="text-lg opacity-80 max-w-2xl mx-auto">
          Uno spazio dedicato allo studio e alla crescita personale, 
          dove la comunità si incontra per condividere conoscenza e obiettivi.
        </p>
      </div>
    </header>
  )
}

export default Header