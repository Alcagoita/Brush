//
//  ConfirmationView.swift
//  BrushShareExtension — KAN-91
//
//  SwiftUI confirmation form presented inside the share extension sheet.
//  Mirrors the layout and tokens of ShareReceiveScreen.tsx (KAN-90).
//
//  States:
//    .loading     — spinner + raw message card while Cloud Function runs
//    .confirm     — editable form pre-filled with AI parse result
//    .failure     — raw text in title field + manual-entry note
//
//  On "Add to Brush": writes task to Firestore, calls onComplete.
//  On "Discard":      calls onDiscard without writing.
//

import SwiftUI

// MARK: - Design tokens

private extension Color {
    // Light-mode Brush palette (extensions always run in light mode for simplicity).
    static let brushBg      = Color(hex: "#fdfdfb")
    static let brushSurface = Color(hex: "#f6f5f1")
    static let brushLine    = Color(.sRGB, red: 20/255, green: 20/255, blue: 18/255, opacity: 0.08)
    static let brushText    = Color(hex: "#1a1a18")
    static let brushMuted   = Color(hex: "#8a8a85")
    static let brushFaint   = Color(hex: "#bdbdb7")
    static let brushAccent  = Color(hex: "#e8a86a")
    static let brushNearTint2  = Color(hex: "#f9ede0")
    static let brushNearBorder = Color(hex: "#e8c9a0")
    static let brushNearText   = Color(hex: "#7a4a20")

    /// Initialise from a "#RRGGBB" hex string.
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgb: UInt64 = 0
        Scanner(string: h).scanHexInt64(&rgb)
        self.init(
            .sRGB,
            red:   Double((rgb >> 16) & 0xFF) / 255,
            green: Double((rgb >> 8)  & 0xFF) / 255,
            blue:  Double( rgb        & 0xFF) / 255
        )
    }
}

// MARK: - Screen state

enum ShareScreenState {
    case loading(rawText: String)
    case confirm(rawText: String, result: ParseResult)
    case failure(rawText: String)
}

// MARK: - ConfirmationView

struct ConfirmationView: View {

    let state: ShareScreenState
    let onComplete: () -> Void    // called after successful task write
    let onDiscard:  () -> Void    // called without writing

    // ── Editable form state ────────────────────────────────────────────────────
    @State private var title    = ""
    @State private var poi:     BrushPoiType? = nil
    @State private var time:    Date? = nil
    @State private var showTimePicker = false
    @State private var category: TaskCategory = .personal

    @State private var titleError = ""
    @State private var saving     = false
    @FocusState private var titleFocused: Bool

    // ── Seeding ────────────────────────────────────────────────────────────────
    private var rawText: String {
        switch state {
        case .loading(let t): return t
        case .confirm(let t, _): return t
        case .failure(let t): return t
        }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    switch state {
                    case .loading(let raw):
                        loadingBody(rawText: raw)
                    case .confirm(_, let result):
                        confirmationBody(result: result)
                    case .failure(let raw):
                        failureBody(rawText: raw)
                    }
                }
                .padding(.horizontal, 22)
                .padding(.bottom, 32)
            }
            .background(Color.brushBg)
            .navigationTitle("Add from message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Discard") { onDiscard() }
                        .foregroundColor(.brushMuted)
                }
            }
        }
        .onAppear { seedFormState() }
    }

    // MARK: Loading body

    @ViewBuilder
    private func loadingBody(rawText: String) -> some View {
        rawCard(text: rawText)
            .padding(.top, 16)
        VStack(spacing: 12) {
            ProgressView()
                .progressViewStyle(.circular)
                .scaleEffect(1.2)
            Text("Parsing task…")
                .font(.system(size: 14))
                .foregroundColor(.brushMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 32)
    }

    // MARK: Confirmation body

    @ViewBuilder
    private func confirmationBody(result: ParseResult) -> some View {
        Text("AI suggestion — tap to edit")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.brushAccent)
            .tracking(0.5)
            .padding(.top, 12)
            .padding(.bottom, 2)

        titleField()

        divider()

        // POI chips
        sectionLabel("LOCATION")
        poiRow()
        divider()

        // Time
        sectionLabel("TIME")
        if showTimePicker || time != nil {
            DatePicker("", selection: Binding(
                get:  { time ?? Date() },
                set:  { time = $0; showTimePicker = true }
            ), displayedComponents: .hourAndMinute)
            .labelsHidden()
            .padding(.vertical, 4)

            if time != nil {
                Button(action: { time = nil; showTimePicker = false }) {
                    Text("Clear time")
                        .font(.system(size: 13))
                        .foregroundColor(.brushAccent)
                }
            }
        } else {
            chipButton(label: "Set time") { showTimePicker = true }
        }
        divider()

        // Category
        sectionLabel("CATEGORY")
        categoryRow()
        divider()

        ctaButtons()
    }

    // MARK: Failure body

    @ViewBuilder
    private func failureBody(rawText: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.circle")
                .foregroundColor(.brushMuted)
            Text("We couldn't parse a task automatically. Add the details manually.")
                .font(.system(size: 13))
                .foregroundColor(.brushMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color.brushSurface)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brushLine, lineWidth: 1))
        .padding(.top, 8)
        .padding(.bottom, 8)

        titleField()
        divider()
        ctaButtons()
    }

    // MARK: Reusable components

    @ViewBuilder
    private func rawCard(text: String) -> some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundColor(.brushMuted)
            .lineLimit(4)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.brushSurface)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.brushLine, lineWidth: 1))
    }

    @ViewBuilder
    private func titleField() -> some View {
        VStack(alignment: .leading, spacing: 4) {
            TextField("Task title", text: $title)
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(.brushText)
                .focused($titleFocused)
                .submitLabel(.done)
                .padding(.vertical, 16)

            if !titleError.isEmpty {
                Text(titleError)
                    .font(.system(size: 12))
                    .foregroundColor(.red)
            }
        }
        Divider().background(Color.brushLine)
    }

    @ViewBuilder
    private func poiRow() -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // None chip
                poiChip(label: "None", selected: poi == nil) { poi = nil }

                ForEach(BrushPoiType.allCases) { type in
                    poiChip(
                        label: type.displayLabel,
                        sfSymbol: type.sfSymbol,
                        selected: poi == type
                    ) {
                        poi = (poi == type) ? nil : type
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    @ViewBuilder
    private func poiChip(
        label: String,
        sfSymbol: String? = nil,
        selected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let symbol = sfSymbol {
                    Image(systemName: symbol)
                        .font(.system(size: 13))
                }
                Text(label)
                    .font(.system(size: 13))
            }
            .foregroundColor(selected ? .brushNearText : .brushMuted)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(selected ? Color.brushNearTint2 : Color.brushSurface)
            .overlay(
                Capsule().stroke(selected ? Color.brushNearBorder : Color.brushLine, lineWidth: 1)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    @ViewBuilder
    private func categoryRow() -> some View {
        HStack(spacing: 8) {
            ForEach(TaskCategory.allCases) { cat in
                let selected = category == cat
                let color = Color(hex: cat.hexColor)
                Button { category = cat } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(color)
                            .frame(width: 7, height: 7)
                        Text(cat.displayLabel)
                            .font(.system(size: 14))
                            .foregroundColor(color)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(selected ? color.opacity(0.13) : Color.brushSurface)
                    .overlay(Capsule().stroke(selected ? color : Color.brushLine, lineWidth: 1))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func chipButton(label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(.brushMuted)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .overlay(Capsule().stroke(Color.brushLine, lineWidth: 1))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func sectionLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.brushMuted)
            .tracking(0.6)
            .padding(.top, 14)
            .padding(.bottom, 6)
    }

    @ViewBuilder
    private func divider() -> some View {
        Rectangle()
            .fill(Color.brushLine)
            .frame(height: 1)
            .padding(.vertical, 4)
    }

    @ViewBuilder
    private func ctaButtons() -> some View {
        VStack(spacing: 0) {
            Button(action: handleSave) {
                Group {
                    if saving {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(Color.brushBg)
                    } else {
                        Text("Add to Brush")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
                .foregroundColor(Color.brushBg)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(saving ? Color.brushFaint : Color.brushText)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .disabled(saving)
            .padding(.top, 16)
            .accessibilityLabel("Add to Brush")

            Button(action: onDiscard) {
                Text("Discard")
                    .font(.system(size: 15))
                    .foregroundColor(.brushMuted)
                    .padding(.vertical, 18)
            }
            .buttonStyle(.plain)
            .disabled(saving)
        }
    }

    // MARK: Seed form state on appear

    private func seedFormState() {
        switch state {
        case .loading:
            break

        case .confirm(_, let result):
            title = result.title
            poi   = result.suggestedPoi
            if let timeStr = result.suggestedTime {
                let formatter = DateFormatter()
                formatter.dateFormat = "HH:mm"
                time = formatter.date(from: timeStr)
                showTimePicker = true
            }

        case .failure(let raw):
            title = String(raw.prefix(80))
        }
    }

    // MARK: Save

    private func handleSave() {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            titleError = "Title is required."
            titleFocused = true
            return
        }
        titleError = ""

        guard let uid = CloudFunctions.currentUID else {
            // If auth is unavailable (should not happen in normal flow), discard.
            onDiscard()
            return
        }

        saving = true

        let dateStr: String = {
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            return fmt.string(from: Date())
        }()

        let poiStr     = poi?.rawValue
        let timeStr: String? = {
            guard let t = time else { return nil }
            let fmt = DateFormatter(); fmt.dateFormat = "HH:mm"
            return fmt.string(from: t)
        }()

        Task {
            do {
                try await CloudFunctions.addTask(
                    uid:      uid,
                    title:    trimmed,
                    category: category.rawValue,
                    poi:      poiStr,
                    time:     timeStr,
                    date:     dateStr
                )
                await MainActor.run { onComplete() }
            } catch {
                await MainActor.run { saving = false }
            }
        }
    }
}
