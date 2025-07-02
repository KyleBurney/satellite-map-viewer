import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const satelliteIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff0000" width="20" height="20">
      <circle cx="12" cy="12" r="8" fill="#ff0000" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

function App() {
  const [satellites, setSatellites] = useState({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'satellite-position') {
        const data = message.data;
        setSatellites(prev => ({
          ...prev,
          [data.satelliteId]: {
            ...data,
            lastSeen: new Date()
          }
        }));
        setLastUpdate(new Date());
      }
    };
    
    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString() : 'Never';
  };

  const formatCoordinate = (coord) => {
    return coord ? coord.toFixed(4) : 'N/A';
  };

  return (
    <div className="App">
      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? 'Connected' : 'Disconnected'}
      </div>
      
      <div className="satellite-info">
        <h3>Satellite Tracker</h3>
        <p><strong>Last Update:</strong> {formatTime(lastUpdate)}</p>
        <p><strong>Satellites Tracked:</strong> {Object.keys(satellites).length}</p>
        
        {Object.values(satellites).map(satellite => (
          <div key={satellite.satelliteId} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <h4>{satellite.satelliteName}</h4>
            <p><strong>ID:</strong> {satellite.satelliteId}</p>
            <p><strong>Lat:</strong> {formatCoordinate(satellite.latitude)}</p>
            <p><strong>Lng:</strong> {formatCoordinate(satellite.longitude)}</p>
            <p><strong>Alt:</strong> {satellite.altitude ? `${satellite.altitude.toFixed(0)} km` : 'N/A'}</p>
            <p><strong>Velocity:</strong> {satellite.velocity ? `${satellite.velocity.toFixed(2)} km/s` : 'N/A'}</p>
            <p><strong>Source:</strong> {satellite.source}</p>
            <p><strong>Last Seen:</strong> {formatTime(satellite.lastSeen)}</p>
          </div>
        ))}
      </div>

      <MapContainer 
        center={[0, 0]} 
        zoom={2} 
        className="map-container"
        style={{ height: '100vh', width: '100vw' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {Object.values(satellites).map(satellite => (
          satellite.latitude && satellite.longitude && (
            <Marker
              key={satellite.satelliteId}
              position={[satellite.latitude, satellite.longitude]}
              icon={satelliteIcon}
            >
              <Popup>
                <div>
                  <h4>{satellite.satelliteName}</h4>
                  <p><strong>ID:</strong> {satellite.satelliteId}</p>
                  <p><strong>Position:</strong> {formatCoordinate(satellite.latitude)}, {formatCoordinate(satellite.longitude)}</p>
                  <p><strong>Altitude:</strong> {satellite.altitude ? `${satellite.altitude.toFixed(0)} km` : 'N/A'}</p>
                  <p><strong>Velocity:</strong> {satellite.velocity ? `${satellite.velocity.toFixed(2)} km/s` : 'N/A'}</p>
                  <p><strong>Source:</strong> {satellite.source}</p>
                  <p><strong>Last Update:</strong> {formatTime(satellite.lastSeen)}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}

export default App;