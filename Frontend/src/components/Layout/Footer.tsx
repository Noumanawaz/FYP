import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail, Mic } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050505] text-white overflow-hidden relative border-t border-white/5 pt-20">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Company Info */}
          <div className="space-y-6">
            <Link to="/" className="inline-block group">
              <div className="flex items-center text-2xl font-extrabold tracking-tight">
                <span className="text-white group-hover:text-cyan-400 transition-colors">V</span>
                <div className="mx-0.5 relative">
                  <Mic className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                </div>
                <span className="text-white group-hover:text-cyan-400 transition-colors">CABITE</span>
              </div>
            </Link>
            
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm font-light">
              Pakistan's first voice-ordering platform. Experience authentic cuisine at the speed of sound with our next-gen AI.
            </p>
            
            <div className="flex space-x-4">
              {[
                { Icon: Facebook, href: "#" },
                { Icon: Twitter, href: "#" },
                { Icon: Instagram, href: "#" },
                { Icon: Youtube, href: "#" }
              ].map((social, idx) => (
                <motion.a 
                  key={idx}
                  whileHover={{ y: -3, scale: 1.1 }}
                  href={social.href} 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  <social.Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="font-bold text-white tracking-wider uppercase text-sm">Explore</h3>
            <ul className="space-y-3">
              {[
                { label: "Pakistani Restaurants", path: "/restaurants" },
                { label: "Vocabite Mart", path: "/vocabite-mart" },
                { label: "Voice Ordering", path: "/voice-order" },
                { label: "About Us", path: "/about" },
                { label: "Help Center", path: "/help" }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link 
                    to={link.path} 
                    className="text-gray-400 hover:text-cyan-400 transition-colors text-sm font-light inline-flex items-center group"
                  >
                    <span className="w-0 h-0.5 bg-cyan-400 mr-0 transition-all group-hover:w-2 group-hover:mr-2"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="font-bold text-white tracking-wider uppercase text-sm">Get in Touch</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-gray-400 group">
                <MapPin className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-0.5" />
                <span className="text-sm font-light leading-relaxed">Karachi, Lahore, Islamabad<br/>Pakistan</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400 group">
                <Phone className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                <span className="text-sm font-light">+92 300 123 4567</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400 group">
                <Mail className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                <span className="text-sm font-light">support@vocabite.pk</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400 group">
                <Mic className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                <span className="text-sm font-light">Voice Support Available 24/7</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h3 className="font-bold text-white tracking-wider uppercase text-sm">Stay Updated</h3>
            <p className="text-gray-400 text-sm font-light">Subscribe to get special offers, free giveaways, and updates.</p>
            <form className="relative group" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500/50 text-white placeholder-gray-600 text-sm transition-colors"
                required
              />
              <button 
                type="submit" 
                className="absolute right-1 top-1 bottom-1 px-4 bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors shadow-lg"
              >
                Join
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs font-light">
            © {new Date().getFullYear()} Vocabite. All rights reserved. Built for the future of ordering.
          </p>
          
          <div className="flex space-x-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item, idx) => (
              <Link 
                key={idx} 
                to="#" 
                className="text-gray-500 hover:text-white text-xs font-light transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;