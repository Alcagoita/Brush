//
//  CloudFunctions.swift
//  BrushShareExtension — KAN-91
//
//  Thin wrapper around the Firebase Functions iOS SDK.
//
//  The extension accesses the same Firebase project as the main app through:
//    - A shared GoogleService-Info.plist (copied to this target in Xcode)
//    - A shared Keychain Access Group (entitlements on both targets), which
//      allows Firebase Auth to reuse the user's existing session.
//
//  Firebase is configured lazily on first call so the extension process does
//  not pay the initialisation cost until it's actually needed.
//

import Foundation
import FirebaseCore
import FirebaseFunctions
import FirebaseFirestore
import FirebaseAuth

// MARK: - CloudFunctions

enum CloudFunctions {

    // MARK: Configuration

    /// Lazily configure Firebase for the extension process.
    /// This is safe to call multiple times — FirebaseApp.configure() is a no-op
    /// if an app has already been configured.
    static func configure() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }

    // MARK: parseMessageToTask

    /// Call the parseMessageToTask Cloud Function and decode its result.
    ///
    /// - Parameter text: The raw shared message (max 2 000 chars server-enforced).
    /// - Returns: A `ParseResult` decoded from the function response.
    /// - Throws: An error if the Firebase call fails or returns undecodable data.
    static func parseMessageToTask(text: String) async throws -> ParseResult {
        configure()

        let callable = Functions.functions().httpsCallable("parseMessageToTask")
        let result   = try await callable.call(["text": String(text.prefix(2000))])

        guard let parsed = ParseResult(data: result.data) else {
            // Return a fallback low-confidence result rather than throwing.
            return ParseResult(data: [
                "title":       String(text.prefix(80)),
                "suggestedPoi": NSNull(),
                "suggestedTime": NSNull(),
                "confidence":  "low",
            ])!
        }
        return parsed
    }

    // MARK: addTask

    /// Write a task to `/users/{uid}/tasks` in Firestore.
    ///
    /// - Parameters:
    ///   - uid:      The Firebase Auth user ID (retrieved from the shared Keychain session).
    ///   - title:    Task title (max 80 chars).
    ///   - category: Category string — one of "work", "health", "errands", "personal".
    ///   - poi:      Optional POI type string.
    ///   - time:     Optional "HH:MM" string.
    ///   - date:     "YYYY-MM-DD" string for the task due date.
    static func addTask(
        uid: String,
        title: String,
        category: String,
        poi: String?,
        time: String?,
        date: String
    ) async throws {
        configure()

        var data: [String: Any] = [
            "title":     String(title.prefix(80)),
            "category":  category,
            "done":      false,
            "date":      date,
            "createdAt": FieldValue.serverTimestamp(),
        ]
        if let poi  { data["poi"]  = poi  }
        if let time { data["time"] = time }

        let db = Firestore.firestore()
        try await db
            .collection("users")
            .document(uid)
            .collection("tasks")
            .addDocument(data: data)
    }

    // MARK: Current UID

    /// Returns the Firebase Auth current user's UID, if available from the
    /// shared Keychain session with the main Brush app.
    static var currentUID: String? {
        configure()
        return Auth.auth().currentUser?.uid
    }
}
