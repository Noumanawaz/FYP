import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail, Mic } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {/* Vocabite Logo */}
              <div className="flex items-center text-xl font-bold text-primary-400">
                <span className="text-primary-400">V</span>
                <div className="mx-1">
                  <Mic className="w-5 h-5 text-primary-400" />
                </div>
                <span className="text-primary-400">CABITE</span>
              </div>
            </div>
            <p className="text-gray-300 mb-4 text-sm">
              Pakistan's first voice-ordering platform for authentic Pakistani cuisine.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/restaurants" className="text-gray-300 hover:text-primary-400 transition-colors text-sm">
                  Pakistani Restaurants
                </Link>
              </li>
              <li>
                <Link to="/vocabite-mart" className="text-gray-300 hover:text-primary-400 transition-colors text-sm">
                  Vocabite Mart
                </Link>
              </li>
              <li>
                <Link to="/voice-order" className="text-gray-300 hover:text-primary-400 transition-colors text-sm">
                  Voice Ordering
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-primary-400 transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-gray-300 hover:text-primary-400 transition-colors text-sm">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 text-sm">Karachi, Lahore, Islamabad</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 text-sm">+92 300 123 4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 text-sm">support@vocabite.pk</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mic className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 text-sm">Voice Support 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-300 text-sm">
                © 2024 Vocabite. All rights reserved.
              </p>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-end space-x-4">
              <Link to="/privacy" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;