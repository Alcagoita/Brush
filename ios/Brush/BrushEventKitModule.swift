/**
 * BrushEventKitModule.swift — Native EventKit wrapper for iOS (KAN-85).
 *
 * Exposes two methods to React Native JS:
 *   - fetchReminders()           → incomplete Reminders, requesting access if needed
 *   - fetchCalendarEvents(days)  → future Calendar events up to `days` ahead
 *
 * Permissions are requested at call time (not on app launch). If the user
 * previously denied access, the promise rejects with code PERMISSION_DENIED
 * so the JS layer can show a Settings deep-link prompt.
 *
 * iOS 17 introduced new requestFullAccess* APIs. This module handles both
 * pre-17 and 17+ using #available checks, satisfying the iOS 15.1 minimum.
 */

import Foundation
import EventKit
import React

@objc(BrushEventKitModule)
class BrushEventKitModule: NSObject {

  private let store = EKEventStore()

  override static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Reminders

  @objc func fetchReminders(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    requestRemindersAccess { [weak self] granted in
      guard let self else { return }
      guard granted else {
        reject("PERMISSION_DENIED", "Reminders access was not granted.", nil)
        return
      }
      self.loadReminders(resolve: resolve, reject: reject)
    }
  }

  private func requestRemindersAccess(completion: @escaping (Bool) -> Void) {
    if #available(iOS 17, *) {
      store.requestFullAccessToReminders { granted, _ in completion(granted) }
    } else {
      store.requestAccess(to: .reminder) { granted, _ in completion(granted) }
    }
  }

  private func loadReminders(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let predicate = store.predicateForIncompleteReminders(
      withDueDateStarting: nil,
      ending: nil,
      calendars: nil
    )
    store.fetchReminders(matching: predicate) { reminders in
      guard let reminders else {
        reject("FETCH_ERROR", "Failed to fetch reminders.", nil)
        return
      }
      let result: [[String: Any]] = reminders.compactMap { reminder in
        guard let title = reminder.title, !title.trimmingCharacters(in: .whitespaces).isEmpty else {
          return nil
        }
        var item: [String: Any] = ["title": title]
        if let components = reminder.dueDateComponents,
           let date = Calendar.current.date(from: components) {
          item["dueDateString"] = Self.iso8601(date)
        }
        return item
      }
      resolve(result)
    }
  }

  // MARK: - Calendar events

  @objc func fetchCalendarEvents(
    _ daysAhead: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    requestCalendarAccess { [weak self] granted in
      guard let self else { return }
      guard granted else {
        reject("PERMISSION_DENIED", "Calendar access was not granted.", nil)
        return
      }
      self.loadCalendarEvents(daysAhead: Int(daysAhead), resolve: resolve, reject: reject)
    }
  }

  private func requestCalendarAccess(completion: @escaping (Bool) -> Void) {
    if #available(iOS 17, *) {
      store.requestFullAccessToEvents { granted, _ in completion(granted) }
    } else {
      store.requestAccess(to: .event) { granted, _ in completion(granted) }
    }
  }

  private func loadCalendarEvents(
    daysAhead: Int,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let now  = Date()
    var components = DateComponents()
    components.day = daysAhead
    guard let end = Calendar.current.date(byAdding: components, to: now) else {
      reject("DATE_ERROR", "Failed to compute end date.", nil)
      return
    }

    let predicate = store.predicateForEvents(withStart: now, end: end, calendars: nil)
    let events = store.events(matching: predicate)

    let result: [[String: Any]] = events.compactMap { event in
      guard let title = event.title, !title.trimmingCharacters(in: .whitespaces).isEmpty else {
        return nil
      }
      return [
        "title":           title,
        "startDateString": Self.iso8601(event.startDate),
        "isAllDay":        event.isAllDay,
      ]
    }
    resolve(result)
  }

  // MARK: - Helpers

  private static let formatter: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime]
    return f
  }()

  private static func iso8601(_ date: Date) -> String {
    formatter.string(from: date)
  }
}
