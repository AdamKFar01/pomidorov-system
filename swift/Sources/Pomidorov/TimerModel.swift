import Foundation

enum Mode: String, CaseIterable {
    case work = "Work"
    case shortBreak = "Short Break"
    case longBreak = "Long Break"

    var seconds: Int {
        switch self {
        case .work: return 25 * 60
        case .shortBreak: return 5 * 60
        case .longBreak: return 15 * 60
        }
    }
}

final class TimerModel: ObservableObject {
    @Published private(set) var mode: Mode = .work
    @Published private(set) var secondsLeft: Int = Mode.work.seconds
    @Published private(set) var isRunning: Bool = false
    @Published private(set) var finishedCount: Int = 0

    private var timer: Timer?

    var display: String {
        String(format: "%02d:%02d", secondsLeft / 60, secondsLeft % 60)
    }

    func start() {
        guard !isRunning, secondsLeft > 0 else { return }
        isRunning = true
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func pause() {
        isRunning = false
        timer?.invalidate()
        timer = nil
    }

    func reset() {
        pause()
        secondsLeft = mode.seconds
    }

    func select(_ newMode: Mode) {
        pause()
        mode = newMode
        secondsLeft = newMode.seconds
    }

    private func tick() {
        guard secondsLeft > 0 else {
            finish()
            return
        }
        secondsLeft -= 1
        if secondsLeft == 0 {
            finish()
        }
    }

    private func finish() {
        pause()
        if mode == .work {
            finishedCount += 1
        }
    }
}
