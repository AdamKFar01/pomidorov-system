import SwiftUI

struct ContentView: View {
    @StateObject private var model = TimerModel()

    var body: some View {
        VStack(spacing: 24) {
            Picker("", selection: Binding(
                get: { model.mode },
                set: { model.select($0) }
            )) {
                ForEach(Mode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            Text(model.display)
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .monospacedDigit()

            HStack(spacing: 12) {
                Button(model.isRunning ? "Pause" : "Start") {
                    model.isRunning ? model.pause() : model.start()
                }
                .keyboardShortcut(.space, modifiers: [])

                Button("Reset") {
                    model.reset()
                }
                .keyboardShortcut("r", modifiers: .command)
            }
            .controlSize(.large)

            Text("Pomodoros done: \(model.finishedCount)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .frame(width: 360)
    }
}
