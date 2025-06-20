import React from 'react'

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 to-blue-900/20"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-bold text-2xl mb-6 text-cyan-300">Contatti</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm">📧</span>
                </div>
                <span className="text-slate-300">associazioneforopiossasco@gmail.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm">📍</span>
                </div>
                <span className="text-slate-300">Via Alfieri 4, Piossasco (TO)</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-2xl mb-6 text-cyan-300">Servizi</h3>
            <div className="space-y-3">
              <p className="text-slate-300">• Aula Studio Attrezzata</p>
              <p className="text-slate-300">• Gruppi di Studio</p>
              <p className="text-slate-300">• Eventi Formativi</p>
              <p className="text-slate-300">• Workshop Tematici</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-2xl mb-6 text-cyan-300">Links Utili</h3>
            <div className="space-y-3">
              {['Regolamento Interno', 'Modulo Iscrizione', 'Privacy Policy', 'Cookie Policy'].map((link, index) => (
                <a key={index} href="#" className="block text-slate-300 hover:text-cyan-300 transition-colors duration-300 hover:translate-x-2 transform">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-center md:text-left">
              © 2025 Aula Studio - Associazione del Terzo Settore. Tutti i diritti riservati.
            </p>
            <div className="flex space-x-6">
              {['Instagram', 'Facebook', 'Telegram', 'Email'].map((platform, index) => (
                <a key={index} href="#" className="text-slate-400 hover:text-cyan-300 transition-all duration-300 hover:scale-110 transform">
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer