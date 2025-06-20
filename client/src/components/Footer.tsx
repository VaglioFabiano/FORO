import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="text-white py-12 px-6" style={{backgroundColor: 'rgb(12, 73, 91)'}}>
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-xl mb-4">Contatti</h3>
            <div className="space-y-2 text-white/80">
              <p>📧 associazioneforopiossasco@gmail.com</p>
              <p>📍 Via Alfieri 4, Piossasco (TO)</p>
            </div>
          </div>
          
  
          
          <div>
            <h3 className="font-bold text-xl mb-4">Links Utili</h3>
            <div className="space-y-2">
              <a href="#" className="block text-white/80 hover:text-white transition-colors">
                Regolamento Interno
              </a>
              <a href="#" className="block text-white/80 hover:text-white transition-colors">
                Modulo Iscrizione
              </a>
              <a href="#" className="block text-white/80 hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-8 text-center">
          <p className="text-white/60 mb-4">
            © 2025 Aula Studio - Associazione del Terzo Settore
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-white/60 hover:text-white transition-colors">
              Instagram
            </a>
            <a href="#" className="text-white/60 hover:text-white transition-colors">
              Facebook
            </a>
            <a href="#" className="text-white/60 hover:text-white transition-colors">
              Telegram
            </a>
            <a href="#" className="text-white/60 hover:text-white transition-colors">
              Email
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer