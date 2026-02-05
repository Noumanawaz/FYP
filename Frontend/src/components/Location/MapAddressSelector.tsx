import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
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

const MapAddressSelector: React.FC<MapAddressSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialCoords = null,
  title = 'Select Location on Map',
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
      setLocError('Geolocation is not supported by your browser.');
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
        setLocError(`Unable to get location: ${err.message}`);
        setLoadingLoc(false);
        // Set default to Karachi if geolocation fails
        const defaultCoords = { lat: 24.8607, lng: 67.0011 };
        setCoords(defaultCoords);
        setSelectedCoords(defaultCoords);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    // You can add reverse geocoding here to get address from coordinates
    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleUseLocation = () => {
    if (selectedCoords) {
      onSelect(selectedCoords, address || undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-[95%] max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loadingLoc && <div className="text-sm text-gray-600">Finding your location…</div>}
          {locError && <div className="text-sm text-red-600">{locError}</div>}

          <div className="h-[420px] rounded-xl overflow-hidden border relative">
            <MapContainer
              center={coords ? [coords.lat, coords.lng] : [24.8607, 67.0011]}
              zoom={coords ? 13 : 13}
              className="h-full w-full relative"
              style={{ cursor: 'crosshair' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <MapClickHandler onMapClick={handleMapClick} />

              {selectedCoords && (
                <>
                  <Marker position={[selectedCoords.lat, selectedCoords.lng]}>
                    <Popup>Selected Location</Popup>
                  </Marker>
                  <Circle
                    center={[selectedCoords.lat, selectedCoords.lng]}
                    radius={500}
                    pathOptions={{ color: 'blue', fillColor: 'skyblue', fillOpacity: 0.2 }}
                  />
                  <Recenter lat={selectedCoords.lat} lng={selectedCoords.lng} />
                </>
              )}

              {coords && !selectedCoords && (
                <>
                  <Marker position={[coords.lat, coords.lng]}>
                    <Popup>Your current location</Popup>
                  </Marker>
                  <Circle
                    center={[coords.lat, coords.lng]}
                    radius={15000}
                    pathOptions={{ color: 'blue', fillColor: 'skyblue', fillOpacity: 0.2 }}
                  />
                  <Recenter lat={coords.lat} lng={coords.lng} />
                </>
              )}

              {/* Locate button */}
              <div className="absolute bottom-4 right-4 z-[1000]">
                <button
                  onClick={handleLocate}
                  className="p-3 rounded-full shadow bg-white hover:bg-gray-100 border border-gray-300"
                  aria-label="Locate"
                >
                  <Navigation className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </MapContainer>
          </div>

          {selectedCoords && (
            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>
                  Selected: {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUseLocation}
              disabled={!selectedCoords}
              className={`px-4 py-2 rounded-lg text-white ${
                selectedCoords
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapAddressSelector;

