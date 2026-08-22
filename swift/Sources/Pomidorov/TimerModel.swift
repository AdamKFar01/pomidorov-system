import Foundation

enum Mode: String, CaseIterable, Identifiable {
    case work
    case shortBreak
    case longBreak

    var id: String { rawValue }

    var label: String {
        switch self {
        case .work: return "Focus"
        case .shortBreak: return "Short break"
        case .longBreak: return "Long break"
        }
    }

    var defaultMinutes: Int {
        switch self {
        case .work: return 25
        case .shortBreak: return 5
        case .longBreak: return 15
        }
    }
}

/// What the session indicator reports. Mirrors the four states the web
/// version showed: ready, running, paused, finished.
enum SessionState {
    case ready, running, paused, finished

    var label: String {
        switch self {
        case .ready: return "Ready"
        case .running: return "Running"
        case .paused: return "Paused"
        case .finished: return "Finished"
        }
    }
}

final class TimerModel: ObservableObject {

    static let range = 1...180

    @Published private(set) var mode: Mode = .work
    @Published private(set) var secondsLeft: Int
    @Published private(set) var isRunning = false
    @Published private(set) var finishedCount = 0

    /// Minutes per mode, persisted across launches.
    @Published private(set) var minutes: [Mode: Int]

    private var timer: Timer?
    private let store: UserDefaults
    private static let storeKey = "pomidorov.lengths"

    init(store: UserDefaults = .standard) {
        self.store = store
        self.minutes = Self.load(from: store)
        self.secondsLeft = (Self.load(from: store)[.work] ?? Mode.work.defaultMinutes) * 60
    }

    // MARK: Derived

    var display: String {
        String(format: "%02d:%02d", secondsLeft / 60, secondsLeft % 60)
    }

    var state: SessionState {
        if secondsLeft == 0 { return .finished }
        if isRunning { return .running }
        return secondsLeft == duration(for: mode) ? .ready : .paused
    }

    func duration(for mode: Mode) -> Int {
        (minutes[mode] ?? mode.defaultMinutes) * 60
    }

    // MARK: Timer

    func start() {
        guard !isRunning, secondsLeft > 0 else { return }
        isRunning = true
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
        // Keeps ticking while menus are open or the window is being dragged.
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    func pause() {
        isRunning = false
        timer?.invalidate()
        timer = nil
    }

    func toggle() {
        isRunning ? pause() : start()
    }

    func reset() {
        pause()
        secondsLeft = duration(for: mode)
    }

    func select(_ next: Mode) {
        pause()
        mode = next
        secondsLeft = duration(for: next)
    }

    private func tick() {
        guard secondsLeft > 0 else { return }
        secondsLeft -= 1
        if secondsLeft == 0 {
            pause()
            if mode == .work { finishedCount += 1 }
        }
    }

    // MARK: Settings

    func setMinutes(_ value: Int, for mode: Mode) {
        guard Self.range.contains(value) else { return }
        minutes[mode] = value
        persist()
        if !isRunning, self.mode == mode {
            secondsLeft = duration(for: mode)
        }
    }

    func restoreDefaults() {
        minutes = Dictionary(uniqueKeysWithValues: Mode.allCases.map { ($0, $0.defaultMinutes) })
        persist()
        if !isRunning {
            secondsLeft = duration(for: mode)
        }
    }

    private func persist() {
        let raw = Dictionary(uniqueKeysWithValues: minutes.map { ($0.key.rawValue, $0.value) })
        store.set(raw, forKey: Self.storeKey)
    }

    private static func load(from store: UserDefaults) -> [Mode: Int] {
        var result = Dictionary(
            uniqueKeysWithValues: Mode.allCases.map { ($0, $0.defaultMinutes) }
        )
        guard let raw = store.dictionary(forKey: storeKey) as? [String: Int] else {
            return result
        }
        for mode in Mode.allCases {
            if let value = raw[mode.rawValue], range.contains(value) {
                result[mode] = value
            }
        }
        return result
    }
}
