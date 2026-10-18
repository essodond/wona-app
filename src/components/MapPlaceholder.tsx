import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

type Props = {
  children?: React.ReactNode;
  style?: any;
  latitude?: number;
  longitude?: number;
  zoom?: number;
};

// Coordonnées de Lomé, Togo
const LOME_LAT = 6.1256;
const LOME_LNG = 1.2317;
const DEFAULT_ZOOM = 14;

export default function MapPlaceholder({
  children,
  style,
  latitude = LOME_LAT,
  longitude = LOME_LNG,
  zoom = DEFAULT_ZOOM,
}: Props) {
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        
        L.marker([${latitude}, ${longitude}], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDMyIDQwIj48cGF0aCBmaWxsPSIjRTg3OTFFIiBkPSJNMTYgMEMxMC40IDAgNiA0LjQgNiAxMGMwIDEwIDE2IDMwIDE2IDMwczEwLTIwIDEwLTMwYzAtNS42LTQuNC0xMC0xMC0xMHptMCA4YzEuMSAwIDIgLjkgMiAycy0uOSAyLTIgMi0yLS45LTItMnMuOS0yIDItMnoiLz48L3N2Zz4=',
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40],
          }),
        }).bindPopup('Lomé, Togo').openPopup();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: mapHTML }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={true}
        javaScriptEnabled={true}
      />
      {/* Contenu enfant overlay */}
      <View style={styles.childrenOverlay} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  childrenOverlay: StyleSheet.absoluteFill,
});

export function MapPin({ style, icon }: { style?: any; icon?: React.ReactNode }) {
  return (
    <View style={[pinStyles.pin, style]}>
      {icon}
    </View>
  );
}

const pinStyles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
