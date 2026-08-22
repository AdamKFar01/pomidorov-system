import SwiftUI

struct ContentView: View {
    @StateObject private var model = TimerModel()
    @State private var showSettings = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            header
            stage
            tally
            if showSettings {
                SettingsPanel(model: model)
                    .transition(
                        .opacity.combined(with: .offset(y: -8))
                    )
            }
        }
        .padding(24)
        .frame(width: 380)
        .background(Theme.background)
    }

    private var header: some View {
        HStack {
            Text("Pomidorov")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.inkSoft)
            Spacer()
            Button(showSettings ? "Done" : "Settings") {
                withAnimation(
                    .timingCurve(0.23, 1, 0.32, 1,
                                 duration: showSettings ? Theme.panelOut : Theme.panelIn)
                ) {
                    showSettings.toggle()
                }
            }
            .buttonStyle(GhostButton())
        }
    }

    private var stage: some View {
        VStack(spacing: 18) {
            SessionIndicator(mode: model.mode, state: model.state)

            Text(model.display)
                .font(.system(size: 76, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .kerning(-1.5)
                .foregroundStyle(model.state == .finished ? Theme.accent : Theme.ink)
                .animation(.easeInOut(duration: 0.24), value: model.state == .finished)

            SegmentedModes(selected: model.mode) { model.select($0) }

            HStack(spacing: 8) {
                Button(model.isRunning ? "Pause" : "Start") { model.toggle() }
                    .buttonStyle(PrimaryButton())
                    .frame(maxWidth: .infinity)
                    .keyboardShortcut(.space, modifiers: [])

                Button("Reset") { model.reset() }
                    .buttonStyle(SecondaryButton())
                    .keyboardShortcut("r", modifiers: [])
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 28)
        .padding(.bottom, 24)
        .frame(maxWidth: .infinity)
        // A defined edge rather than a soft elevation. Pairing a hairline
        // border with a wide shadow is the generated-UI signature.
        .background(
            RoundedRectangle(cornerRadius: Theme.radiusSurface)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusSurface)
                .stroke(Theme.line, lineWidth: 1)
        )
    }

    private var tally: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("\(model.finishedCount)")
                .font(.system(size: 15, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(Theme.ink)
            Text("focus sessions finished today")
                .font(.system(size: 13))
                .foregroundStyle(Theme.inkFaint)
        }
        .padding(.horizontal, 4)
    }
}

// MARK: - Session indicator

private struct SessionIndicator: View {
    let mode: Mode
    let state: SessionState

    var body: some View {
        HStack(spacing: 8) {
            // The only dot in the interface, and it carries real state.
            Circle()
                .fill(state == .ready || state == .paused ? Theme.inkFaint : Theme.accent)
                .frame(width: 7, height: 7)
                .overlay(
                    Circle()
                        .stroke(Theme.accentSoft, lineWidth: state == .finished ? 3 : 0)
                        .scaleEffect(state == .finished ? 1.8 : 1)
                )
                // Finishing happens a handful of times a day, so it earns a
                // moment. One shot, no loop.
                .animation(.timingCurve(0.23, 1, 0.32, 1, duration: 0.26), value: state)

            Text(mode.label)
                .foregroundStyle(Theme.inkSoft)
            Text("·")
                .foregroundStyle(Theme.inkFaint)
            Text(state.label)
                .foregroundStyle(Theme.inkFaint)
        }
        .font(.system(size: 13, weight: .medium))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(mode.label), \(state.label)")
    }
}

// MARK: - Segmented control

private struct SegmentedModes: View {
    let selected: Mode
    let onSelect: (Mode) -> Void

    var body: some View {
        HStack(spacing: 2) {
            ForEach(Mode.allCases) { mode in
                Button { onSelect(mode) } label: {
                    Text(mode.label)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(mode == selected ? Theme.ink : Theme.inkSoft)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(mode == selected ? Theme.surface : .clear)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(mode == selected ? [.isSelected] : [])
            }
        }
        .padding(3)
        .background(Capsule().fill(Theme.background))
        .overlay(Capsule().stroke(Theme.line, lineWidth: 1))
        .animation(Theme.easeOut, value: selected)
    }
}

// MARK: - Settings

private struct SettingsPanel: View {
    @ObservedObject var model: TimerModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Session lengths")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.inkSoft)

            ForEach(Mode.allCases) { mode in
                LengthField(
                    label: mode.label,
                    value: model.minutes[mode] ?? mode.defaultMinutes,
                    onChange: { model.setMinutes($0, for: mode) }
                )
            }

            Button("Restore defaults") { model.restoreDefaults() }
                .buttonStyle(GhostButton())
                .padding(.top, 4)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.radiusSurface).fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusSurface)
                .stroke(Theme.line, lineWidth: 1)
        )
    }
}

private struct LengthField: View {
    let label: String
    let value: Int
    let onChange: (Int) -> Void

    var body: some View {
        // Label above the input, never a placeholder standing in for one.
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Theme.ink)

            HStack(spacing: 8) {
                Stepper(
                    value: Binding(get: { value }, set: onChange),
                    in: TimerModel.range
                ) {
                    Text("\(value)")
                        .font(.system(size: 14))
                        .monospacedDigit()
                        .foregroundStyle(Theme.ink)
                        .frame(width: 40, alignment: .leading)
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.radiusInput)
                                .fill(Theme.background)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.radiusInput)
                                .stroke(Theme.line, lineWidth: 1)
                        )
                }
                .accessibilityLabel("\(label) minutes")

                Text("min")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.inkSoft)
            }
        }
    }
}

// MARK: - Button styles

private struct PrimaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(Theme.accentInk)
            .padding(.vertical, 11)
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity)
            .background(Capsule().fill(Theme.accent))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.easeOut, value: configuration.isPressed)
            .contentShape(Capsule())
    }
}

private struct SecondaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(Theme.ink)
            .padding(.vertical, 11)
            .padding(.horizontal, 20)
            .background(Capsule().fill(.clear))
            .overlay(Capsule().stroke(Theme.line, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.easeOut, value: configuration.isPressed)
            .contentShape(Capsule())
    }
}

private struct GhostButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Theme.inkSoft)
            .padding(.vertical, 6)
            .padding(.horizontal, 10)
            .background(Capsule().fill(.clear))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.easeOut, value: configuration.isPressed)
            .contentShape(Capsule())
    }
}
