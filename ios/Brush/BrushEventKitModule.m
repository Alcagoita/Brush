/**
 * BrushEventKitModule.m — Objective-C bridge for BrushEventKitModule (KAN-85).
 *
 * Exposes the Swift EventKit wrapper to the React Native bridge.
 */

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BrushEventKitModule, NSObject)

RCT_EXTERN_METHOD(
  fetchReminders:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  fetchCalendarEvents:(double)daysAhead
  resolve:(RCTPromiseResolveBlock)resolve
  reject:(RCTPromiseRejectBlock)reject
)

+ (BOOL)requiresMainQueueSetup;

@end
