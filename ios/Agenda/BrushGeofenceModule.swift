/**
 * BrushGeofenceModule.swift — Native geofence wrapper for iOS (KAN-56).
 *
 * Wraps CLLocationManager's region monitoring API so React Native JS can
 * register and remove circular geofences without a third-party library.
 *
 * Supports:
 *   - registerGeofence(id, lat, lng, radiusMeters)
 *   - removeGeofence(id)
 *   - removeAllGeofences()
 *   - Emits 'onGeofenceEntry' event to JS on CLCircularRegion entry
 *
 * iOS limits: 20 monitored regions per app. With ≤10 POI types in practice
 * this limit is not a concern.
 *
 * Note: CLCircularRegion boundary crossing simulation does NOT work in the
 * iOS Simulator. Test on a real device or use Instruments → Location simulation.
 */

import Foundation
import CoreLocation
import React

@objc(BrushGeofenceModule)
class BrushGeofenceModule: RCTEventEmitter, CLLocationManagerDelegate {

  private let locationManager = CLLocationManager()
  private var hasListeners = false

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    return ["onGeofenceEntry"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Lifecycle

  override init() {
    super.init()
    locationManager.delegate = self
    // 'always' authorisation is required for background geofence callbacks.
    // The permission was already requested in geolocation.ts (KAN-22).
    locationManager.requestAlwaysAuthorization()
  }

  // MARK: - JS-callable methods

  @objc func registerGeofence(
    _ id: String,
    lat: Double,
    lng: Double,
    radiusMeters: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let center     = CLLocationCoordinate2D(latitude: lat, longitude: lng)
    let radius     = min(radiusMeters, locationManager.maximumRegionMonitoringDistance)
    let region     = CLCircularRegion(center: center, radius: radius, identifier: id)
    region.notifyOnEntry = true
    region.notifyOnExit  = false // exit events not needed for v1 notification flow

    locationManager.startMonitoring(for: region)
    resolve(nil)
  }

  @objc func removeGeofence(
    _ id: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    for region in locationManager.monitoredRegions where region.identifier == id {
      locationManager.stopMonitoring(for: region)
    }
    resolve(nil)
  }

  @objc func removeAllGeofences(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    for region in locationManager.monitoredRegions {
      locationManager.stopMonitoring(for: region)
    }
    resolve(nil)
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    guard hasListeners, let circularRegion = region as? CLCircularRegion else { return }
    sendEvent(withName: "onGeofenceEntry", body: ["geofenceId": circularRegion.identifier])
  }

  func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
    print("[BrushGeofenceModule] Monitoring failed for region \(region?.identifier ?? "unknown"): \(error.localizedDescription)")
  }
}
