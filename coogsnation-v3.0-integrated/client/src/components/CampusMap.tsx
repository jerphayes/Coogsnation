import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Users, Info, Building2, GraduationCap, Car, Coffee, Utensils } from 'lucide-react';
import type { CampusLocation, Event } from '@shared/schema';

// Import Leaflet CSS first
const LEAFLET_CSS = `
  .leaflet-container {
    height: 100%;
    width: 100%;
    z-index: 0;
  }
  .leaflet-popup-content-wrapper {
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
  .leaflet-popup-content {
    margin: 12px 16px;
    min-width: 250px;
  }
  .leaflet-popup-tip {
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
  }
  .event-marker {
    background: #dc2626;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  .location-marker {
    background: #2563eb;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
`;

interface MapContainer {
  setView: (coords: [number, number], zoom: number) => void;
  remove: () => void;
}

interface Marker {
  addTo: (map: MapContainer) => Marker;
  bindPopup: (content: string) => Marker;
  openPopup: () => Marker;
  on: (event: string, handler: () => void) => Marker;
}

interface LeafletMap {
  map: (element: HTMLElement, options: any) => MapContainer;
  tileLayer: (url: string, options: any) => { addTo: (map: MapContainer) => void };
  divIcon: (options: any) => any;
  marker: (coords: [number, number], options?: any) => Marker;
  layerGroup: () => any;
}

declare global {
  interface Window {
    L?: LeafletMap;
  }
}

interface CampusMapProps {
  selectedCategory?: string;
  onLocationSelect?: (location: CampusLocation) => void;
  showEvents?: boolean;
  height?: string;
}

export function CampusMap({ 
  selectedCategory, 
  onLocationSelect, 
  showEvents = true,
  height = "500px" 
}: CampusMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapContainer | null>(null);
  const locationMarkersRef = useRef<any>(null);
  const eventMarkersRef = useRef<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);

  // Fetch campus locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery<CampusLocation[]>({
    queryKey: ['/api/campus/locations'],
    refetchInterval: 60000, // Refresh every minute for real-time updates
  });

  // Fetch events with locations if showEvents is true
  const { data: eventsWithLocations = [], isLoading: eventsLoading } = useQuery<Array<Event & { campusLocation?: CampusLocation }>>({
    queryKey: ['/api/events/with-locations'],
    enabled: showEvents,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time event updates
  });

  const isLoading = isMapLoading || locationsLoading || (showEvents && eventsLoading);

  // Filter locations by category if provided
  const filteredLocations = selectedCategory 
    ? locations.filter(loc => loc.category === selectedCategory)
    : locations;

  // University of Houston coordinates (center of campus)
  const UH_CENTER: [number, number] = [29.7199, -95.3422];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic': return '🎓';
      case 'residence': return '🏠';
      case 'dining': return '🍽️';
      case 'recreation': return '🏃';
      case 'parking': return '🚗';
      case 'admin': return '🏢';
      case 'health': return '🏥';
      case 'library': return '📚';
      default: return '📍';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic': return '#dc2626'; // red
      case 'residence': return '#16a34a'; // green
      case 'dining': return '#ea580c'; // orange
      case 'recreation': return '#7c3aed'; // purple
      case 'parking': return '#6b7280'; // gray
      case 'admin': return '#0891b2'; // cyan
      case 'health': return '#db2777'; // pink
      case 'library': return '#059669'; // emerald
      default: return '#2563eb'; // blue
    }
  };

  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.querySelector('#leaflet-css')) {
      const style = document.createElement('style');
      style.id = 'leaflet-css';
      style.textContent = LEAFLET_CSS;
      document.head.appendChild(style);
    }

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      if (!window.L) {
        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      if (mapRef.current && window.L && !mapInstanceRef.current) {
        try {
          // Initialize map
          const map = window.L.map(mapRef.current, {
            center: UH_CENTER,
            zoom: 16,
            zoomControl: true,
            attributionControl: true
          });

          // Add tile layer
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);

          // Create layer groups for markers
          if (window.L) {
            locationMarkersRef.current = window.L.layerGroup().addTo(map);
            eventMarkersRef.current = window.L.layerGroup().addTo(map);
          }

          mapInstanceRef.current = map;
          setIsMapLoading(false);
        } catch (error) {
          console.error('Error initializing map:', error);
          setIsMapLoading(false);
        }
      }
    };

    loadLeaflet().catch(console.error);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      locationMarkersRef.current = null;
      eventMarkersRef.current = null;
    };
  }, []);

  // Add markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !locationMarkersRef.current || !eventMarkersRef.current) return;

    // Clear existing markers
    locationMarkersRef.current.clearLayers();
    eventMarkersRef.current.clearLayers();

    // Helper function to escape HTML
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Add location markers
    filteredLocations.forEach((location: CampusLocation) => {
      if (location.latitude && location.longitude) {
        const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
        const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;

        const icon = window.L!.divIcon({
          html: `<div style="background: ${getCategoryColor(location.category)}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px;">${getCategoryIcon(location.category)}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12],
          className: 'location-marker'
        });

        const marker = window.L!.marker([lat, lng], { icon });
        
        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-lg mb-2">${escapeHtml(location.name)}</h3>
            ${location.description ? `<p class="text-sm font-medium mb-2" style="color: #333;">${escapeHtml(location.description)}</p>` : ''}
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">${escapeHtml(location.category)}</span>
              ${location.capacity ? `<span class="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">Capacity: ${location.capacity}</span>` : ''}
            </div>
            ${location.address ? `<p class="text-xs font-medium" style="color: #333;">${escapeHtml(location.address)}</p>` : ''}
          </div>
        `;
        
        marker.bindPopup(popupContent);
        
        marker.on('click', () => {
          setSelectedLocation(location);
          onLocationSelect?.(location);
        });

        marker.addTo(locationMarkersRef.current);
      }
    });

    // Add event markers if enabled
    if (showEvents) {
      eventsWithLocations.forEach((event: Event & { campusLocation?: CampusLocation }) => {
        if (event.campusLocation?.latitude && event.campusLocation?.longitude) {
          const lat = typeof event.campusLocation.latitude === 'string' ? parseFloat(event.campusLocation.latitude) : event.campusLocation.latitude;
          const lng = typeof event.campusLocation.longitude === 'string' ? parseFloat(event.campusLocation.longitude) : event.campusLocation.longitude;

          const eventIcon = window.L!.divIcon({
            html: `<div style="background: #dc2626; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px;">📅</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
            className: 'event-marker'
          });

          const eventMarker = window.L!.marker(
            [lat, lng], 
            { icon: eventIcon }
          );
          
          const eventDate = new Date(event.eventDate).toLocaleDateString();
          const eventTime = new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const eventPopupContent = `
            <div class="p-2">
              <h3 class="font-semibold text-lg mb-2">${escapeHtml(event.title)}</h3>
              <p class="text-sm text-gray-800 mb-2">${escapeHtml(event.description || '')}</p>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">Event</span>
                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">${escapeHtml(event.category || 'General')}</span>
              </div>
              <p class="text-xs text-gray-800 mb-1">📅 ${eventDate} at ${eventTime}</p>
              <p class="text-xs text-gray-800">📍 ${escapeHtml(event.campusLocation.name)}</p>
            </div>
          `;
          
          eventMarker.bindPopup(eventPopupContent);
          eventMarker.addTo(eventMarkersRef.current);
        }
      });
    }
  }, [filteredLocations, eventsWithLocations, showEvents, onLocationSelect]);

  const handleLocationClick = (location: CampusLocation) => {
    if (mapInstanceRef.current && location.latitude && location.longitude) {
      const lat = typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude;
      const lng = typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude;
      mapInstanceRef.current.setView([lat, lng], 18);
      setSelectedLocation(location);
      onLocationSelect?.(location);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full border rounded-lg" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-800">Loading campus map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1">
          <div 
            ref={mapRef} 
            className="w-full border rounded-lg shadow-sm" 
            style={{ height }}
            data-testid="campus-map"
          />
        </div>

        {/* Sidebar */}
        <div className="w-80">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Campus Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {filteredLocations.length === 0 ? (
                <p className="text-gray-800 text-sm">No locations found</p>
              ) : (
                <div className="space-y-2">
                  {filteredLocations.map((location: CampusLocation) => (
                    <div
                      key={location.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedLocation?.id === location.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleLocationClick(location)}
                      data-testid={`location-card-${location.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{location.name}</h4>
                          {location.description && (
                            <p className="text-xs text-gray-800 mt-1">{location.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {location.category}
                            </Badge>
                            {location.capacity && (
                              <span className="text-xs text-gray-800">
                                <Users className="w-3 h-3 inline mr-1" />
                                {location.capacity}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-lg">
                          {getCategoryIcon(location.category)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events at selected location */}
          {selectedLocation && showEvents && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Events Here
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsWithLocations
                  .filter((event: Event & { campusLocation?: CampusLocation }) => event.campusLocationId === selectedLocation.id)
                  .map((event: Event & { campusLocation?: CampusLocation }) => (
                    <div key={event.id} className="border-b pb-2 mb-2 last:border-b-0">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <p className="text-xs text-gray-800 mt-1">
                        {new Date(event.eventDate).toLocaleDateString()} at{' '}
                        {new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                {eventsWithLocations.filter((event: Event & { campusLocation?: CampusLocation }) => event.campusLocationId === selectedLocation.id).length === 0 && (
                  <p className="text-gray-800 text-sm">No upcoming events</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}