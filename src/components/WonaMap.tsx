import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

type Point = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
};

type Props = {
  points?: Point[];
  style?: StyleProp<ViewStyle>;
  showRoute?: boolean;
};

const LOME = { latitude: 6.1319, longitude: 1.2228 };

export default function WonaMap({ points = [], style, showRoute = true }: Props) {
  const center = points[0] || LOME;
  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      region={
        points.length === 1
          ? {
              latitude: center.latitude,
              longitude: center.longitude,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            }
          : undefined
      }
      showsUserLocation
      showsMyLocationButton
    >
      {points.map((point, index) => (
        <Marker
          key={`${point.latitude}-${point.longitude}-${index}`}
          coordinate={point}
          title={point.title}
          description={point.description}
          pinColor={point.color}
        />
      ))}
      {showRoute && points.length > 1 ? (
        <Polyline coordinates={points} strokeColor="#E8791E" strokeWidth={4} />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { minHeight: 220, width: '100%' } });

