// SDPS Broadcaster - Native macOS Sonoma / Sequoia WidgetKit Extension (SwiftUI)
// Add this file to your Xcode macOS Widget Extension target

import WidgetKit
import SwiftUI
import AppIntents

struct SDPSWidgetEntry: TimelineEntry {
    let date: Date
    let broadcasterIp: String
    let isOnline: Bool
    let pingMs: Int
}

struct SDPSProvider: TimelineProvider {
    func placeholder(in context: Context) -> SDPSWidgetEntry {
        SDPSWidgetEntry(date: Date(), broadcasterIp: "192.168.29.252", isOnline: true, pingMs: 12)
    }

    func getSnapshot(in context: Context, completion: @escaping (SDPSWidgetEntry) -> ()) {
        let entry = SDPSWidgetEntry(date: Date(), broadcasterIp: "192.168.29.252", isOnline: true, pingMs: 14)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SDPSWidgetEntry>) -> ()) {
        let ip = UserDefaults(suiteName: "group.org.sdpublic.widget")?.string(forKey: "broadcasterIp") ?? "192.168.29.252"
        let url = URL(string: "http://\(ip)/")!

        var request = URLRequest(url: url)
        request.timeoutInterval = 2.0

        let startTime = Date()
        URLSession.shared.dataTask(with: request) { _, response, error in
            let isOnline = error == nil
            let elapsed = Int(Date().timeIntervalSince(startTime) * 1000)
            let entry = SDPSWidgetEntry(date: Date(), broadcasterIp: ip, isOnline: isOnline, pingMs: elapsed)

            let nextUpdate = Calendar.current.date(byAdding: .second, value: 5, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }.resume()
    }
}

// Native macOS Sonoma Desktop Widget View
struct SDPSWidgetEntryView: View {
    var entry: SDPSProvider.Entry

    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "radio.fill")
                        .foregroundColor(.orange)
                        .font(.caption2)
                    Text("SDPS WIDGET")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.secondary)
                }

                Spacer()

                HStack(spacing: 4) {
                    Circle()
                        .fill(entry.isOnline ? Color.green : Color.red)
                        .frame(width: 6, height: 6)
                    Text(entry.isOnline ? "ONLINE" : "OFFLINE")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(entry.isOnline ? .green : .red)
                }
            }

            Divider()
                .background(Color.white.opacity(0.1))

            // Controls
            VStack(spacing: 6) {
                // Mic Button
                Button(action: {
                    triggerHardware(ip: entry.broadcasterIp, act: "Connect", source: "sMic")
                }) {
                    HStack {
                        Image(systemName: "mic.fill")
                        Text("SPEAK NOW")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.blue)
                    .cornerRadius(10)
                    .foregroundColor(.white)
                }
                .buttonStyle(.plain)

                // Quick Chime
                HStack(spacing: 6) {
                    Button(action: {
                        triggerHardware(ip: entry.broadcasterIp, act: "Connect", source: "sFile", track: "1")
                    }) {
                        Text("🔔 Bell")
                            .font(.system(size: 10, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                    }
                    .buttonStyle(.plain)

                    Button(action: {
                        triggerHardware(ip: entry.broadcasterIp, act: "Cancel", source: "sMic")
                    }) {
                        Text("🛑 Stop")
                            .font(.system(size: 10, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color.red.opacity(0.8))
                            .cornerRadius(8)
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(12)
        .background(Color(red: 22/255, green: 28/255, blue: 45/255).opacity(0.85))
        .containerBackground(for: .widget) {
            Color(red: 15/255, green: 23/255, blue: 42/255)
        }
    }

    func triggerHardware(ip: String, act: String, source: String, track: String = "1") {
        let url = URL(string: "http://\(ip)/BcastDo")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let body = "sUser=admin&sPass=admin&sSource=\(source)&sFilename=\(track)&sDest=1-200&sRooms=1-200&sAct=\(act)"
        req.httpBody = body.data(using: .utf8)
        URLSession.shared.dataTask(with: req).resume()
    }
}

@main
struct SDPSWidget: Widget {
    let kind: String = "SDPSWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SDPSProvider()) { entry in
            SDPSWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("SDPS Broadcaster")
        .description("Control SDPS School Audio & Bell System directly from your macOS Desktop.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
