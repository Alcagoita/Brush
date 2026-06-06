//
//  ShareViewController.swift
//  BrushShareExtension — KAN-91
//
//  Entry point for the iOS Share Extension.
//  The system instantiates this class when the user picks Brush in the share sheet.
//
//  Flow:
//    1. viewDidLoad → extract text from NSExtensionItem
//    2. Show loading UI (ConfirmationView in .loading state)
//    3. Call parseMessageToTask Cloud Function asynchronously
//    4. Replace loading UI with .confirm or .failure state
//    5. User taps "Add to Brush" → CloudFunctions.addTask → completeRequest
//       User taps "Discard"     → cancelRequest (no write)
//
//  Memory budget: ~20MB baseline + Firebase ~15MB = ~35MB, well under the 120MB cap.
//

import UIKit
import SwiftUI

final class ShareViewController: UIViewController {

    // The UIHostingController that owns the SwiftUI tree.
    private var hostingVC: UIHostingController<AnyView>?

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        // Use the system adaptive colour so the brief flash before SwiftUI renders
        // matches the active appearance (light or dark) rather than always white.
        view.backgroundColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0.055, green: 0.055, blue: 0.047, alpha: 1)  // dark  #0e0e0c
                : UIColor(red: 0.992, green: 0.992, blue: 0.984, alpha: 1)  // light #fdfdfb
        }

        extractSharedText { [weak self] text in
            guard let self else { return }
            self.show(state: .loading(rawText: text))
            self.callParseFunction(text: text)
        }
    }

    // MARK: Text extraction

    /// Reads the plain-text content from the share sheet's NSExtensionItem.
    private func extractSharedText(completion: @escaping (String) -> Void) {
        guard
            let item     = extensionContext?.inputItems.first as? NSExtensionItem,
            let provider = item.attachments?.first,
            provider.hasItemConformingToTypeIdentifier("public.plain-text")
        else {
            completion("")
            return
        }

        provider.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { rawItem, _ in
            DispatchQueue.main.async {
                completion((rawItem as? String) ?? "")
            }
        }
    }

    // MARK: Cloud Function call

    private func callParseFunction(text: String) {
        Task {
            do {
                let result = try await CloudFunctions.parseMessageToTask(text: text)
                await MainActor.run {
                    self.show(state: .confirm(rawText: text, result: result))
                }
            } catch {
                await MainActor.run {
                    self.show(state: .failure(rawText: text))
                }
            }
        }
    }

    // MARK: SwiftUI host management

    private func show(state: ShareScreenState) {
        // Tear down any previous hosting controller.
        hostingVC?.willMove(toParent: nil)
        hostingVC?.view.removeFromSuperview()
        hostingVC?.removeFromParent()
        hostingVC = nil

        let rootView = ConfirmationView(
            state:      state,
            onComplete: { [weak self] in self?.complete() },
            onDiscard:  { [weak self] in self?.discard() }
        )
        let vc = UIHostingController(rootView: AnyView(rootView))

        addChild(vc)
        view.addSubview(vc.view)
        vc.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vc.view.topAnchor.constraint(equalTo: view.topAnchor),
            vc.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            vc.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            vc.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        vc.didMove(toParent: self)
        hostingVC = vc
    }

    // MARK: Extension lifecycle

    /// Called by ConfirmationView after the task has been successfully written to Firestore.
    private func complete() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    /// Called by ConfirmationView when the user taps Discard.
    private func discard() {
        extensionContext?.cancelRequest(
            withError: NSError(domain: "com.brush.ShareExtension", code: 0)
        )
    }
}
