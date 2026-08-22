import SwiftUI

/// Design tokens.
///
/// One accent, taken from the logo's tomato red and used identically in every
/// state: break sessions are told apart by label and selection, never by a
/// different colour. Neutrals are warm throughout, with no cool greys mixed in.
///
/// Hover moves away from the label colour rather than always darkening, since
/// darkening in dark mode drops the contrast below WCAG AA.
enum Theme {

    // MARK: Palette

    static let accent = adaptive(light: 0xC8402C, dark: 0xE2604A)
    static let accentHover = adaptive(light: 0xB03827, dark: 0xEF7660)
    static let accentInk = adaptive(light: 0xFFFFFF, dark: 0x1C1210)
    static let accentSoft = adaptive(
        light: 0xC8402C, lightAlpha: 0.10,
        dark: 0xE2604A, darkAlpha: 0.14
    )

    static let background = adaptive(light: 0xFAF9F8, dark: 0x161413)
    static let surface = adaptive(light: 0xFFFFFF, dark: 0x1F1C1A)
    static let line = adaptive(light: 0xE7E3E0, dark: 0x322D2A)

    static let ink = adaptive(light: 0x1C1A19, dark: 0xF4F1EF)
    static let inkSoft = adaptive(light: 0x6D6763, dark: 0xA8A09B)
    /// Verified at 4.78:1 on surface and 4.54:1 on background in light,
    /// 4.93:1 and 5.35:1 in dark. Do not lighten without re-measuring.
    static let inkFaint = adaptive(light: 0x787170, dark: 0x918984)

    // MARK: Shape

    static let radiusSurface: CGFloat = 16
    static let radiusInput: CGFloat = 10

    // MARK: Motion

    /// Press feedback sits in the 100 to 160ms window. Anything faster does
    /// not register, anything slower feels sluggish.
    static let press: Double = 0.16
    static let panelIn: Double = 0.20
    /// Exits outpace entrances: the system should respond faster than it reveals.
    static let panelOut: Double = 0.15

    static let easeOut = SwiftUI.Animation.timingCurve(0.23, 1, 0.32, 1, duration: press)

    // MARK: Helpers

    private static func adaptive(light: Int, dark: Int) -> Color {
        adaptive(light: light, lightAlpha: 1, dark: dark, darkAlpha: 1)
    }

    private static func adaptive(
        light: Int, lightAlpha: Double,
        dark: Int, darkAlpha: Double
    ) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            return NSColor(
                hex: isDark ? dark : light,
                alpha: isDark ? darkAlpha : lightAlpha
            )
        })
    }
}

private extension NSColor {
    convenience init(hex: Int, alpha: Double) {
        self.init(
            srgbRed: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            alpha: alpha
        )
    }
}
