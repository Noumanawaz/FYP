import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper to recenter map when coordinates change
const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
};

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
};

interface MapAddressSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (coords: { lat: number; lng: number }, address?: string) => void;
  initialCoords?: { lat: number; lng: number } | null;
  title?: string;
}

import Modal from '../Common/Modal';

const MapAddressSelector: React.FC<MapAddressSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialCoords = null,
  title = 'Geospatial Node Selector',
}) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    if (isOpen && !coords) {
      handleLocate();
    } else if (isOpen && initialCoords) {
      setCoords(initialCoords);
      setSelectedCoords(initialCoords);
    }
  }, [isOpen]);

  const handleLocate = () => {
    setLocError(null);
    setLoadingLoc(true);

    if (!('geolocation' in navigator)) {
      setLocError('Geolocation navigation not supported by current terminal.');
      setLoadingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        setSelectedCoords(newCoords);
        setLoadingLoc(false);
      },
      (err) => {
        setLocError(`GPS Handshake failure: ${err.message}`);
        setLoadingLoc(false);
        const defaultCoords = { lat: 24.8607, lng: 67.0011 };
        setCoords(defaultCoords);
        setSelectedCoords(defaultCoords);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleUseLocation = () => {
    if (selectedCoords) {
      onSelect(selectedCoords, address || undefined);
      onClose();
    }
  };

  const footer = (
    <div className="flex gap-4">
      <button
        onClick={onClose}
        className="flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
      >
        Discard
      </button>
      <button
        onClick={handleUseLocation}
        disabled={!selectedCoords}
        className="flex-[2] py-3 bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/20 hover:bg-cyan-400 transition-all disabled:opacity-50"
      >
        Lock Coordinates
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {loadingLoc && (
          <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl animate-pulse">
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">Establishing GPS Link...</span>
          </div>
        )}
        
        {locError && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] font-bold text-red-500 uppercase tracking-widest">
            {locError}
          </div>
        )}

        <div className="h-[450px] rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 relative shadow-inner">
          <MapContainer
            center={coords ? [coords.lat, coords.lng] : [24.8607, 67.0011]}
            zoom={coords ? 15 : 13}
            className="h-full w-full grayscale-[0.2] dark:invert dark:hue-rotate-180 dark:brightness-95"
            style={{ cursor: 'crosshair', background: '#f8fafc' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapClickHandler onMapClick={handleMapClick} />

            {selectedCoords && (
              <>
                <Marker position={[selectedCoords.lat, selectedCoords.lng]}>
                  <Popup className="premium-popup">Node: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}</Popup>
                </Marker>
                <Circle
                  center={[selectedCoords.lat, selectedCoords.lng]}
                  radius={200}
                  pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.1, weight: 1.5 }}
                />
                <Recenter lat={selectedCoords.lat} lng={selectedCoords.lng} />
              </>
            )}

            <div className="absolute bottom-6 right-6 z-[1000]">
              <button
                onClick={handleLocate}
                className="p-4 rounded-2xl shadow-2xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-90 transition-all group"
                aria-label="Locate"
              >
                <Navigation className="w-5 h-5 group-hover:text-cyan-500 transition-colors" />
              </button>
            </div>
          </MapContainer>
        </div>

        {selectedCoords && (
          <div className="flex items-center gap-4 p-5 bg-gray-50/50 dark:bg-white/[0.03] rounded-3xl border border-gray-100 dark:border-white/5 backdrop-blur-sm">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">Target Coordinates</p>
              <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MapAddressSelector;

