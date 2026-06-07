//
//  ConfirmationView.swift
//  BrushShareExtension — KAN-91
//
//  SwiftUI confirmation form presented inside the share extension sheet.
//  Mirrors the layout and tokens of ShareReceiveScreen.tsx (KAN-90).
//
//  Dark-mode support: BrushPalette carries both light and dark token sets.
//  The view reads @Environment(\.colorScheme) and selects the right palette
//  automatically — no traitCollection plumbing needed.
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

// MARK: - Color(hex:) helper

private extension Color {
    /// Initialise from a "#RRGGBB" hex string. Alpha is always 1.
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

// MARK: - BrushPalette

/// Full colour token set for one appearance mode.
/// Values mirror the TypeScript tokens in src/theme/tokens.ts exactly.
struct BrushPalette {

    let bg:         Color
    let surface:    Color
    let line:       Color   // translucent — use .overlay, not .background
    let text:       Color
    let muted:      Color
    let faint:      Color
    let accent:     Color
    let nearTint2:  Color
    let nearBorder: Color
    let nearText:   Color

    // MARK: Light

    /// Light-mode palette — matches the `light` constant in tokens.ts.
    static let light = BrushPalette(
        bg:         Color(hex: "#fdfdfb"),
        surface:    Color(hex: "#f6f5f1"),
        line:       Color(.sRGB, red: 20/255,  green: 20/255,  blue: 18/255,  opacity: 0.08),
        text:       Color(hex: "#1a1a18"),
        muted:      Color(hex: "#8a8a85"),
        faint:      Color(hex: "#bdbdb7"),
        accent:     Color(hex: "#e8a86a"),
        nearTint2:  Color(hex: "#f9ede0"),
        nearBorder: Color(hex: "#e8c9a0"),
        nearText:   Color(hex: "#7a4a20")
    )

    // MARK: Dark

    /// Dark-mode palette — matches the `dark` constant in tokens.ts.
    static let dark = BrushPalette(
        bg:         Color(hex: "#0e0e0c"),
        surface:    Color(hex: "#171715"),
        line:       Color(.sRGB, red: 255/255, green: 255/255, blue: 255/255, opacity: 0.08),
        text:       Color(hex: "#f6f5f2"),
        muted:      Color(hex: "#8a8a85"),
        faint:      Color(hex: "#525250"),
        accent:     Color(hex: "#d4955a"),
        nearTint2:  Color(hex: "#362514"),
        nearBorder: Color(hex: "#6b4020"),
        nearText:   Color(hex: "#dba87a")
    )
}

// MARK: - Screen state

enum ShareScreenState {
    case loading(rawText: String)
    case confirm(rawText: String, result: ParseResult)
    case failure(rawText: String)
}

// MARK: - ConfirmationView

struct ConfirmationView: View {

    let state:      ShareScreenState
    let onComplete: () -> Void    // called after successful task write
    let onDiscard:  () -> Void    // called without writing

    // Drives palette selection — updated automatically by the system.
    @Environment(\.colorScheme) private var colorScheme

    /// Active colour palette for this render pass.
    private var p: BrushPalette { colorScheme == .dark ? .dark : .light }

    // ── Editable form state ────────────────────────────────────────────────────
    @State private var title    = ""
    @State private var poi:     BrushPoiType? = nil
    @State private var time:    Date? = nil
    @State private var showTimePicker = false
    @State private var category: TaskCategory = .personal

    @State private var titleError = ""
    @State private var saving     = false
    @FocusState private var titleFocused: Bool

    // ── Convenience ───────────────────────────────────────────────────────────
    private var rawText: String {
        switch state {
        case .loading(let t): return t
        case .confirm(let t, _): return t
        case .failure(let t): return t
        }
    }

    // MARK: Body

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
            .background(p.bg.ignoresSafeArea())
            .navigationTitle("Add from message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Discard") { onDiscard() }
                        .foregroundColor(p.muted)
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
                .foregroundColor(p.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 32)
    }

    // MARK: Confirmation body

    @ViewBuilder
    private func confirmationBody(result: ParseResult) -> some View {
        Text("AI suggestion — tap to edit")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(p.accent)
            .tracking(0.5)
            .padding(.top, 12)
            .padding(.bottom, 2)

        titleField()
        divider()

        sectionLabel("LOCATION")
        poiRow()
        divider()

        sectionLabel("TIME")
        if showTimePicker || time != nil {
            DatePicker(
                "",
                selection: Binding(
                    get: { time ?? Date() },
                    set: { time = $0; showTimePicker = true }
                ),
                displayedComponents: .hourAndMinute
            )
            .labelsHidden()
            .colorScheme(colorScheme)   // keep the picker tinted correctly
            .padding(.vertical, 4)

            if time != nil {
                Button { time = nil; showTimePicker = false } label: {
                    Text("Clear time")
                        .font(.system(size: 13))
                        .foregroundColor(p.accent)
                }
            }
        } else {
            chipButton(label: "Set time") { showTimePicker = true }
        }
        divider()

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
                .foregroundColor(p.muted)
            Text("We couldn't parse a task automatically. Add the details manually.")
                .font(.system(size: 13))
                .foregroundColor(p.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(p.surface)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(p.line, lineWidth: 1))
        .padding(.top, 8)
        .padding(.bottom, 8)

        titleField()
        divider()
        ctaButtons()
    }

    // MARK: Reusable sub-views

    @ViewBuilder
    private func rawCard(text: String) -> some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundColor(p.muted)
            .lineLimit(4)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(p.surface)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(p.line, lineWidth: 1))
    }

    @ViewBuilder
    private func titleField() -> some View {
        VStack(alignment: .leading, spacing: 4) {
            TextField("Task title", text: $title)
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(p.text)
                .focused($titleFocused)
                .submitLabel(.done)
                .padding(.vertical, 16)

            if !titleError.isEmpty {
                Text(titleError)
                    .font(.system(size: 12))
                    .foregroundColor(.red)
            }
        }
        Rectangle()
            .fill(p.line)
            .frame(height: 1)
    }

    @ViewBuilder
    private func poiRow() -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "None" chip — deselects any active POI
                poiChip(label: "None", sfSymbol: nil, selected: poi == nil) {
                    poi = nil
                }
                ForEach(BrushPoiType.allCases) { type in
                    poiChip(
                        label:    type.displayLabel,
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
        label:    String,
        sfSymbol: String?,
        selected: Bool,
        action:   @escaping () -> Void
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
            .foregroundColor(selected ? p.nearText : p.muted)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(selected ? p.nearTint2 : p.surface)
            .overlay(Capsule().stroke(selected ? p.nearBorder : p.line, lineWidth: 1))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    @ViewBuilder
    private func categoryRow() -> some View {
        // Wraps to a second line on smaller screens — use FlowLayout-style wrapping
        // via a LazyVGrid instead of a plain HStack so pills don't clip.
        let columns = [GridItem(.adaptive(minimum: 80), spacing: 8)]
        LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
            ForEach(TaskCategory.allCases) { cat in
                let selected  = category == cat
                let catColor  = Color(hex: cat.hexColor)
                Button { category = cat } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(catColor)
                            .frame(width: 7, height: 7)
                        Text(cat.displayLabel)
                            .font(.system(size: 14))
                            .foregroundColor(catColor)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(selected ? catColor.opacity(0.13) : p.surface)
                    .overlay(Capsule().stroke(selected ? catColor : p.line, lineWidth: 1))
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
                .foregroundColor(p.muted)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .overlay(Capsule().stroke(p.line, lineWidth: 1))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func sectionLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(p.muted)
            .tracking(0.6)
            .padding(.top, 14)
            .padding(.bottom, 6)
    }

    @ViewBuilder
    private func divider() -> some View {
        Rectangle()
            .fill(p.line)
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
                            .tint(p.bg)
                    } else {
                        Text("Add to Brush")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(p.bg)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(saving ? p.faint : p.text)
                .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .disabled(saving)
            .padding(.top, 16)
            .accessibilityLabel("Add to Brush")

            Button(action: onDiscard) {
                Text("Discard")
                    .font(.system(size: 15))
                    .foregroundColor(p.muted)
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
                let fmt = DateFormatter()
                fmt.dateFormat = "HH:mm"
                time = fmt.date(from: timeStr)
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
            onDiscard()   // auth unavailable — should not happen in normal flow
            return
        }

        saving = true

        let dateStr: String = {
            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            return fmt.string(from: Date())
        }()
        let poiStr  = poi?.rawValue
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
