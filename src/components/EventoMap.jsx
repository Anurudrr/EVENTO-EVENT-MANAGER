import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDate } from '../utils';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; OpenStreetMap &copy; CARTO';

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

const eventMarkerIcon = L.divIcon({
  className: 'evento-map__marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const selectedMarkerIcon = L.divIcon({
  className: 'evento-map__marker evento-map__marker--selected',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

const joinClassNames = (...classes) => classes.filter(Boolean).join(' ');

const toCoordinate = (value, min, max) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return undefined;
  }

  return parsed;
};

const hasCoordinates = (item) => (
  toCoordinate(item?.lat, -90, 90) !== undefined
  && toCoordinate(item?.lng, -180, 180) !== undefined
);

const roundCoordinate = (value) => Number(value.toFixed(6));

const getDateMeta = (item) => {
  if (item?.date) {
    return {
      label: 'Date',
      value: formatDate(item.date),
    };
  }

  const availabilityDate = Array.isArray(item?.availability)
    ? item.availability.find((entry) => entry?.date)?.date
    : '';

  if (availabilityDate) {
    return {
      label: 'Availability',
      value: formatDate(availabilityDate),
    };
  }

  if (item?.createdAt) {
    return {
      label: 'Added',
      value: formatDate(item.createdAt),
    };
  }

  return {
    label: 'Date',
    value: 'Schedule pending',
  };
};

const ViewportController = ({ markerItems, selectedLocation }) => {
  const map = useMap();
  const markerKey = markerItems.map((item) => `${item._id}:${item.lat}:${item.lng}`).join('|');
  const selectedKey = selectedLocation ? `${selectedLocation.lat}:${selectedLocation.lng}` : '';

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
    }, 120);

    const targets = selectedLocation
      ? [selectedLocation]
      : markerItems.map((item) => ({ lat: item.lat, lng: item.lng }));

    if (targets.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
      return () => window.clearTimeout(resizeTimer);
    }

    if (targets.length === 1) {
      const [target] = targets;
      map.flyTo([target.lat, target.lng], 13, {
        animate: true,
        duration: 0.7,
      });

      return () => window.clearTimeout(resizeTimer);
    }

    const bounds = L.latLngBounds(targets.map((target) => [target.lat, target.lng]));
    map.flyToBounds(bounds, {
      animate: true,
      duration: 0.7,
      maxZoom: 12,
      padding: [36, 36],
    });

    return () => window.clearTimeout(resizeTimer);
  }, [map, markerKey, selectedKey, markerItems, selectedLocation]);

  return null;
};

const LocationSelector = ({ enabled, onLocationSelect }) => {
  useMapEvents({
    click(event) {
      if (!enabled || typeof onLocationSelect !== 'function') {
        return;
      }

      onLocationSelect({
        lat: roundCoordinate(event.latlng.lat),
        lng: roundCoordinate(event.latlng.lng),
        source: 'map',
      });
    },
  });

  return null;
};

export const EventoMap = React.memo(function EventoMap({
  events = [],
  selectedLocation = null,
  onLocationSelect,
  selectable = false,
  loading = false,
  error = '',
  emptyMessage = 'No mapped event locations are available yet.',
  selectedLabel = 'Pinned location',
  height = 420,
  className = '',
}) {
  const [geoState, setGeoState] = useState({
    isLoading: false,
    error: '',
  });
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

  const markerItems = useMemo(
    () => events.filter(hasCoordinates).map((item) => ({
      ...item,
      lat: Number(item.lat),
      lng: Number(item.lng),
    })),
    [events],
  );

  const normalizedSelectedLocation = useMemo(() => {
    if (!selectedLocation || !hasCoordinates(selectedLocation)) {
      return null;
    }

    return {
      lat: Number(selectedLocation.lat),
      lng: Number(selectedLocation.lng),
    };
  }, [selectedLocation]);

  const canSelect = selectable || typeof onLocationSelect === 'function';
  const mapHeight = typeof height === 'number' ? `${height}px` : height;

  const staticMapUrl = useMemo(() => {
    const center = markerItems.length > 0
      ? `${markerItems[0].lat},${markerItems[0].lng}`
      : '20.5937,78.9629';
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=10&size=800x400&markers=${markerItems.map(m => `${m.lat},${m.lng},red-pushpin`).join('|')}`;
  }, [markerItems]);

  const handleUseMyLocation = () => {
    if (!canSelect || typeof onLocationSelect !== 'function') {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState({
        isLoading: false,
        error: 'Browser geolocation is unavailable on this device.',
      });
      return;
    }

    setGeoState({
      isLoading: true,
      error: '',
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoState({
          isLoading: false,
          error: '',
        });

        onLocationSelect({
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
          source: 'geolocation',
        });
      },
      (positionError) => {
        setGeoState({
          isLoading: false,
          error: positionError.message || 'Unable to access your current location.',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  return (
    <div className={joinClassNames('evento-map', className)} ref={mapRef}>
      <div
        className="evento-map__surface"
        style={{ height: mapHeight, minHeight: mapHeight }}
        data-lenis-prevent
      >
        {!isMapVisible ? (
          <img
            src={staticMapUrl}
            alt="Map preview"
            className="evento-map__static w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="evento-map__canvas"
            preferCanvas
            scrollWheelZoom={false}
            zoomControl
          >
            <TileLayer
              attribution={TILE_ATTR}
              url={TILE_URL}
              maxZoom={19}
              crossOrigin=""
            />

            <ViewportController
              markerItems={markerItems}
              selectedLocation={normalizedSelectedLocation}
            />
            <LocationSelector enabled={canSelect} onLocationSelect={onLocationSelect} />

            {markerItems.map((item) => {
              const dateMeta = getDateMeta(item);

              return (
                <Marker
                  key={item._id || `${item.lat}-${item.lng}`}
                  position={[item.lat, item.lng]}
                  icon={eventMarkerIcon}
                >
                  <Popup>
                    <div className="evento-map__popup">
                      <p className="evento-map__popup-eyebrow">{dateMeta.label}</p>
                      <h3 className="evento-map__popup-title">{item.title || 'Untitled event'}</h3>
                      <p className="evento-map__popup-copy">{dateMeta.value}</p>
                      <p className="evento-map__popup-copy">
                        {item.location || `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {normalizedSelectedLocation && (
              <Marker
                position={[normalizedSelectedLocation.lat, normalizedSelectedLocation.lng]}
                icon={selectedMarkerIcon}
              >
                <Popup>
                  <div className="evento-map__popup">
                    <p className="evento-map__popup-eyebrow">Selected</p>
                    <h3 className="evento-map__popup-title">{selectedLabel}</h3>
                    <p className="evento-map__popup-copy">
                      {normalizedSelectedLocation.lat.toFixed(5)}, {normalizedSelectedLocation.lng.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}

        {canSelect && (
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoState.isLoading}
            className="evento-map__control"
          >
            {geoState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            Use My Location
          </button>
        )}

        {loading && (
          <div className="evento-map__overlay">
            <Loader2 className="h-5 w-5 animate-spin text-noir-accent" />
            <span>Loading map data</span>
          </div>
        )}
      </div>

      <div className="evento-map__meta">
        <div className="evento-map__status">
          <MapPin className="h-4 w-4 text-noir-accent" />
          <span>
            {markerItems.length > 0
              ? `${markerItems.length} mapped event${markerItems.length === 1 ? '' : 's'}`
              : emptyMessage}
          </span>
        </div>

        {canSelect && (
          <div className="evento-map__status">
            <span>
              {normalizedSelectedLocation
                ? `Selected: ${normalizedSelectedLocation.lat.toFixed(5)}, ${normalizedSelectedLocation.lng.toFixed(5)}`
                : 'Click the map to pin a venue with exact coordinates.'}
            </span>
          </div>
        )}
      </div>

      {(error || geoState.error) && (
        <div className="evento-map__error">
          {error || geoState.error}
        </div>
      )}
    </div>
  );
});
