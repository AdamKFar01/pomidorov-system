import SwiftUI

@main
struct PomidorovApp: App {
    var body: some Scene {
        WindowGroup("Pomidorov") {
            ContentView()
        }
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
