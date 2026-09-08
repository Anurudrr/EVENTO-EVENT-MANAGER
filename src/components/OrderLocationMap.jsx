import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoordinates } from '../utils';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO';

const VADODARA_CENTER = [22.3072, 73.1812];

const sellerMarkerIcon = L.divIcon({
  className: 'order-location-map__marker order-location-map__marker--seller',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const buyerMarkerIcon = L.divIcon({
  className: 'order-location-map__marker order-location-map__marker--buyer',
  html: '<span></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const ViewportController = ({ sellerLocation, buyerLocation }) => {
  const map = useMap();

  const locations = useMemo(
    () => [sellerLocation, buyerLocation].filter(Boolean),
    [sellerLocation, buyerLocation],
  );

  const locationKey = locations.map((location) => `${location.lat}:${location.lng}`).join('|');

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 100);

    if (locations.length === 0) {
      map.setView(VADODARA_CENTER, 11, { animate: false });
      return () => window.clearTimeout(resizeTimer);
    }

    if (locations.length === 1) {
      const [location] = locations;
      map.flyTo([location.lat, location.lng], 14, {
        animate: true,
        duration: 0.65,
      });

      return () => window.clearTimeout(resizeTimer);
    }

    const bounds = L.latLngBounds(locations.map((location) => [location.lat, location.lng]));
    map.flyToBounds(bounds, {
      animate: true,
      duration: 0.7,
      maxZoom: 14,
      padding: [28, 28],
    });

    return () => window.clearTimeout(resizeTimer);
  }, [locationKey, locations, map]);

  return null;
};

export const OrderLocationMap = ({
  sellerLocation,
  buyerLocation,
  height = 260,
}) => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsMapVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    if (mapRef.current) {
      observer.observe(mapRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const mapHeight = typeof height === 'number' ? `${height}px` : height;

  const locations = useMemo(
    () => [sellerLocation, buyerLocation].filter(Boolean),
    [sellerLocation, buyerLocation],
  );

  const staticMapUrl = useMemo(() => {
    if (locations.length === 0) return '';
    const center = `${locations[0].lat},${locations[0].lng}`;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=12&size=800x300&markers=${locations.map(m => `${m.lat},${m.lng},red-pushpin`).join('|')}`;
  }, [locations]);

  return (
    <div className="evento-map" ref={mapRef}>
      <div
        className="evento-map__surface"
        style={{ height: mapHeight, minHeight: mapHeight }}
        data-lenis-prevent
      >
        {!isMapVisible && staticMapUrl ? (
          <img
            src={staticMapUrl}
            alt="Map preview"
            className="evento-map__static w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <MapContainer
            center={VADODARA_CENTER}
            zoom={12}
            className="evento-map__canvas"
            preferCanvas
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution={TILE_ATTR}
              url={TILE_URL}
              maxZoom={19}
              crossOrigin=""
            />

            <ViewportController sellerLocation={sellerLocation} buyerLocation={buyerLocation} />

            {sellerLocation && (
              <Marker position={[sellerLocation.lat, sellerLocation.lng]} icon={sellerMarkerIcon}>
                <Popup>
                  <div className="evento-map__popup">
                    <p className="evento-map__popup-eyebrow">Seller pin</p>
                    <h3 className="evento-map__popup-title">Organizer location</h3>
                    <p className="evento-map__popup-copy">{formatCoordinates(sellerLocation)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {buyerLocation && (
              <Marker position={[buyerLocation.lat, buyerLocation.lng]} icon={buyerMarkerIcon}>
                <Popup>
                  <div className="evento-map__popup">
                    <p className="evento-map__popup-eyebrow">Buyer pin</p>
                    <h3 className="evento-map__popup-title">Service location</h3>
                    <p className="evento-map__popup-copy">{formatCoordinates(buyerLocation)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}

      </div>

      <div className="evento-map__meta">
        {sellerLocation && (
          <div className="evento-map__status">
            <span>Seller: {formatCoordinates(sellerLocation)}</span>
          </div>
        )}
        {buyerLocation && (
          <div className="evento-map__status">
            <span>Buyer: {formatCoordinates(buyerLocation)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
