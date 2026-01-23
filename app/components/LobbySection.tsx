import { formatRelativeTime, getTimeControlCategory } from "~/utils/helper";


function LobbyCard({ item }: { item: LobbyItem }) {
    const elo = item.whiteelo || item.blackelo || "?";
    const category = getTimeControlCategory(item.timecontrol);
    
    function formatTimeControl(timeControl: string): string {
        const timeMap: Record<string, string> = {
            "3+0": "3 min",
            "3+2": "3+2",
            "5+0": "5 min",
            "5+3": "5+3",
            "10+0": "10 min",
            "10+5": "10+5",
            unlimited: "∞",
        };
        return timeMap[timeControl] || timeControl;
    };
    
    return (
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
            {/* Rating Badge */}
            {item.is_rated && (
                <div className="absolute right-3 top-3">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Rated
                    </span>
                </div>
            )}

            {/* Main Content */}
            <div className="flex items-center gap-4">
                {/* Avatar Placeholder */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white shadow-inner">
                    {item.username?.charAt(0).toUpperCase() || "?"}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                            {item.username || "Anonymous"}
                        </h3>
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                            {elo}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatRelativeTime(item.created_at)}
                        </span>
                    </div>
                </div>

                {/* Time Control Badge */}
                <div className="text-right">
                    <div className="inline-flex flex-col items-center rounded-lg bg-gray-50 px-3 py-2 group-hover:bg-indigo-50">
                        <span className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
                            {formatTimeControl(item.timecontrol)}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                            {category}
                        </span>
                    </div>
                </div>
            </div>

            {/* Seeking indicator */}
            <div className="mt-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <span className="text-xs text-gray-500">Seeking opponent...</span>
            </div>
        </div>
    );
}
// Lobby Section Component
export default function LobbySection({ showLobby }: { showLobby: LobbyItem[] }) {
    if (!showLobby || showLobby.length === 0) {
        return null;
    }

    return (
        <section className="mt-6">
            {/* Section Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                        <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Players Looking for Games</h2>
                        <p className="text-xs text-gray-500">{showLobby.length} player{showLobby.length !== 1 ? "s" : ""} in lobby</p>
                    </div>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium text-green-700">Live</span>
                </div>
            </div>

            {/* Lobby Grid */}
            <div className="grid gap-3">
                {showLobby.map((item) => (
                    <LobbyCard key={item.id} item={item} />
                ))}
            </div>

            {/* Footer hint */}
            <p className="mt-4 text-center text-xs text-gray-400">
                You'll be automatically matched when a compatible opponent is found
            </p>
        </section>
    );
}
