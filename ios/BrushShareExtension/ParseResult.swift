//
//  ParseResult.swift
//  BrushShareExtension — KAN-91
//
//  Data models mirroring the Cloud Function output shape.
//

import Foundation

// MARK: - ParseResult

/// Structured task data returned by the parseMessageToTask Cloud Function.
struct ParseResult {
    let title: String
    let suggestedPoi: BrushPoiType?
    let suggestedTime: String?       // "HH:MM" 24-hour, or nil
    let confidence: Confidence

    /// True when the AI result is reliable enough to pre-fill the form.
    var isUsable: Bool { confidence != .low }

    // MARK: Decoding from Cloud Function result

    /// Decode from the raw [String: Any] payload returned by httpsCallable.call().
    init?(data: Any) {
        guard let map = data as? [String: Any] else { return nil }
        guard let title = map["title"] as? String else { return nil }

        self.title = String(title.prefix(80))
        self.suggestedTime = {
            guard let t = map["suggestedTime"] as? String,
                  t.range(of: #"^\d{2}:\d{2}$"#, options: .regularExpression) != nil
            else { return nil }
            return t
        }()
        self.suggestedPoi = {
            guard let raw = map["suggestedPoi"] as? String else { return nil }
            return BrushPoiType(rawValue: raw)
        }()
        self.confidence = Confidence(rawValue: map["confidence"] as? String ?? "") ?? .low
    }
}

// MARK: - Confidence

enum Confidence: String {
    case high, medium, low
}

// MARK: - BrushPoiType

/// Mirrors the PoiType union from src/types/index.ts.
enum BrushPoiType: String, CaseIterable, Identifiable {
    case atm, cafe, supermarket, pharmacy

    var id: String { rawValue }

    var displayLabel: String {
        switch self {
        case .atm:         return "ATM"
        case .cafe:        return "Café"
        case .supermarket: return "Market"
        case .pharmacy:    return "Pharmacy"
        }
    }

    /// SF Symbol name used on the POI chip.
    var sfSymbol: String {
        switch self {
        case .atm:         return "dollarsign.circle"
        case .cafe:        return "cup.and.saucer"
        case .supermarket: return "cart"
        case .pharmacy:    return "cross.case"
        }
    }
}

// MARK: - TaskCategory

enum TaskCategory: String, CaseIterable, Identifiable {
    case work, health, errands, personal

    var id: String { rawValue }

    var displayLabel: String { rawValue.capitalized }

    /// Hex colour from the Brush design system token `categories`.
    var hexColor: String {
        switch self {
        case .work:     return "#5b7fd4"
        case .health:   return "#5ba87a"
        case .errands:  return "#8b6bc4"
        case .personal: return "#e8a86a"
        }
    }
}
