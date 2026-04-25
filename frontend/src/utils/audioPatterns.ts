export interface AudioReferenceInfo {
    title: string;
    uploader: string;
    duration_seconds: number;
    description: string;
    tags: string[];
    categories: string[];
    webpage_url: string;
}

export interface ReferenceSuggestions {
    bpm: number;
    seconds: number;
    tags: string;
    arrangementHint: string;
}

export const BPM_HINTS: Array<{ pattern: RegExp; bpm: number }> = [
    { pattern: /\b(drum\s*and\s*bass|dnb)\b/i, bpm: 174 },
    { pattern: /\b(hardstyle)\b/i, bpm: 150 },
    { pattern: /\b(phonk)\b/i, bpm: 160 },
    { pattern: /\b(techno)\b/i, bpm: 130 },
    { pattern: /\b(house|deep house|tech house)\b/i, bpm: 124 },
    { pattern: /\b(trance)\b/i, bpm: 138 },
    { pattern: /\b(trap)\b/i, bpm: 145 },
    { pattern: /\b(hip hop|hip-hop|rap)\b/i, bpm: 95 },
    { pattern: /\b(reggaeton)\b/i, bpm: 96 },
    { pattern: /\b(pop)\b/i, bpm: 120 },
    { pattern: /\b(rnb|r&b|soul)\b/i, bpm: 100 },
    { pattern: /\b(rock|metal)\b/i, bpm: 128 },
    { pattern: /\b(ambient|cinematic)\b/i, bpm: 90 },
];

export const dedupeTokens = (tokens: string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    tokens.forEach((token) => {
        const cleaned = token
            .replace(/[|]/g, ',')
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return;

        const key = cleaned.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(cleaned);
    });
    return out;
};

export const inferReferenceBpm = (info: AudioReferenceInfo): number => {
    const pool = [info.title, info.description, ...(info.tags || []), ...(info.categories || [])]
        .filter(Boolean)
        .join(' ');

    const explicit = pool.match(/(?:^|\b)([6-9]\d|1\d\d|2\d\d)\s?bpm\b/i);
    if (explicit) {
        const parsed = parseInt(explicit[1], 10);
        if (!Number.isNaN(parsed)) return parsed;
    }

    const hinted = BPM_HINTS.find((entry) => entry.pattern.test(pool));
    return hinted?.bpm || 120;
};

export const buildArrangementHint = (durationSeconds: number): string => {
    if (durationSeconds <= 45) {
        return 'short-form hook first: intro (2 bars), verse (4 bars), chorus (8 bars), fast turnaround outro';
    }
    if (durationSeconds <= 120) {
        return 'compact song form: intro, verse, pre-chorus, chorus, verse 2, chorus, bridge, final chorus';
    }
    return 'full song arc: intro, verse, pre, chorus, verse 2, pre, chorus, bridge breakdown, final chorus, outro';
};

export const buildReferenceSuggestions = (
    info: AudioReferenceInfo,
    favoriteArtist: string,
    currentSeconds: number
): ReferenceSuggestions => {
    const bpm = Math.max(70, Math.min(220, inferReferenceBpm(info)));
    const sourceDuration = Number(info.duration_seconds) || currentSeconds || 120;
    const seconds = Math.max(20, Math.min(240, Math.round(sourceDuration / 10) * 10));

    const candidateTags = dedupeTokens([
        favoriteArtist ? `${favoriteArtist} inspired` : '',
        ...(info.categories || []).slice(0, 3),
        ...(info.tags || []).slice(0, 6),
        `${bpm} BPM`,
    ]);
    const tags = candidateTags.join(', ');

    return {
        bpm,
        seconds,
        tags,
        arrangementHint: buildArrangementHint(seconds),
    };
};
