/**
 * BrushGeofenceModule.m — Objective-C bridge for BrushGeofenceModule (KAN-56).
 *
 * Exposes the Swift native module to the React Native bridge.
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BrushGeofenceModule, RCTEventEmitter)

RCT_EXTERN_METHOD(
  registerGeofence:(NSString *)id
  lat:(double)lat
  lng:(double)lng
  radiusMeters:(double)radiusMeters
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  removeGeofence:(NSString *)id
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  removeAllGeofences:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

@end
