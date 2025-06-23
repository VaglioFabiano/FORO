import React, { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle, Heart, MessageSquare, Send, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

// Dati mock per i post Instagram
const instagramPosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop",
    caption: "📚 Sessione di studio intensiva in preparazione agli esami! La biblioteca è il nostro secondo casa 💪 #StudyHard #AssociazioneForo",
    likes: 127,
    time: "2 ore fa"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=400&fit=crop",
    caption: "🎯 Workshop di oggi: tecniche di memorizzazione efficace! Grazie a tutti i partecipanti per l'energia positiva ✨",
    likes: 89,
    time: "1 giorno fa"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop",
    caption: "📖 Nuovi arrivi nella nostra biblioteca! Testi aggiornati per tutte le materie principali 📚 #NuoviLibri",
    likes: 156,
    time: "2 giorni fa"
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&h=400&fit=crop",
    caption: "🤝 Gruppo di studio di diritto costituzionale! L'unione fa la forza, insieme si impara meglio 💡",
    likes: 203,
    time: "3 giorni fa"
  }
];

const SocialSection = () => {
  const [currentPost, setCurrentPost] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-scroll dei post Instagram
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentPost(prev => (prev + 1) % instagramPosts.length);
    }, 4000); // Cambia post ogni 4 secondi

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleSocialClick = (url: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const nextPost = () => {
    setCurrentPost((prev) => (prev + 1) % instagramPosts.length);
    setIsAutoPlaying(false);
  };

  const prevPost = () => {
    setCurrentPost((prev) => (prev - 1 + instagramPosts.length) % instagramPosts.length);
    setIsAutoPlaying(false);
  };

  const currentPostData = instagramPosts[currentPost];

  return (
    <div className="w-full bg-blue-900 text-white py-12 px-8">
      <h2 className="text-3xl font-bold text-center mb-8">Seguici sui social</h2>
      
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-8">
        {/* Instagram Card */}
        <div 
          className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
          onClick={(e) => handleSocialClick('https://www.instagram.com/associazioneforo/', e)}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-lg">
                📸
              </div>
              <div className="ml-3">
                <h3 className="text-gray-900 font-semibold">Instagram</h3>
                <p className="text-gray-600 text-sm">@associazioneforo</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.instagram.com/associazioneforo/', e);
              }}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={16} className="text-gray-600" />
            </button>
          </div>
          
          {/* Instagram Post Carousel */}
          <div className="relative bg-gray-50 h-96">
            <div className="relative h-full overflow-hidden">
              <img 
                src={currentPostData.image} 
                alt="Instagram post"
                className="w-full h-64 object-cover"
              />
              
              {/* Navigation buttons */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  prevPost();
                }}
                className="absolute left-2 top-32 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  nextPost();
                }}
                className="absolute right-2 top-32 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight size={16} />
              </button>
              
              {/* Post indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {instagramPosts.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentPost ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Post content */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <Heart size={20} className="text-gray-600 hover:text-red-500 cursor-pointer transition-colors" />
                  <MessageSquare size={20} className="text-gray-600 hover:text-blue-500 cursor-pointer transition-colors" />
                  <Send size={20} className="text-gray-600 hover:text-green-500 cursor-pointer transition-colors" />
                </div>
                <Bookmark size={20} className="text-gray-600 hover:text-yellow-500 cursor-pointer transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{currentPostData.likes} mi piace</p>
              <p className="text-sm text-gray-700 line-clamp-2">{currentPostData.caption}</p>
              <p className="text-xs text-gray-500 mt-1">{currentPostData.time}</p>
            </div>
          </div>
        </div>

        {/* Facebook Card */}
        <div 
          className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
          onClick={(e) => handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT', e)}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg">
                👥
              </div>
              <div className="ml-3">
                <h3 className="text-gray-900 font-semibold">Facebook</h3>
                <p className="text-gray-600 text-sm">Associazione Foro</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSocialClick('https://www.facebook.com/profile.php?id=61553896114681&locale=it_IT', e);
              }}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={16} className="text-gray-600" />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 h-96 overflow-y-auto">
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    f
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900 text-sm">Associazione Foro</p>
                    <p className="text-xs text-gray-500">2 ore fa</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  📚 Seguici per rimanere aggiornato sulle nostre attività, eventi e sessioni di studio collaborative. La community ti aspetta!
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="hover:text-blue-600 cursor-pointer">👍 Mi piace</span>
                  <span className="hover:text-blue-600 cursor-pointer">💬 Commenta</span>
                  <span className="hover:text-blue-600 cursor-pointer">↗️ Condividi</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    f
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900 text-sm">Associazione Foro</p>
                    <p className="text-xs text-gray-500">1 giorno fa</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  🎯 Nuovi orari di apertura della biblioteca! Siamo aperti anche nei weekend per supportare al meglio i vostri studi. 📖✨
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="hover:text-blue-600 cursor-pointer">👍 Mi piace</span>
                  <span className="hover:text-blue-600 cursor-pointer">💬 Commenta</span>
                  <span className="hover:text-blue-600 cursor-pointer">↗️ Condividi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Telegram Bar */}
      <div 
        className="max-w-6xl mx-auto bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        onClick={(e) => handleSocialClick('https://t.me/aulastudioforo', e)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 mr-4">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white">Telegram</h3>
              <p className="text-blue-100">@aulastudioforo</p>
              <p className="text-sm text-blue-200 mt-1">
                Canale ufficiale per comunicazioni rapide e coordinamento gruppi studio
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 rounded-full px-3 py-1 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white text-sm">Attivo</span>
            </div>
            <ExternalLink size={20} className="text-white transition-transform hover:translate-x-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialSection;