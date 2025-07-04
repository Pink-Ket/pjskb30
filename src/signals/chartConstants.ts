import { signal, computed } from "@preact/signals";

import { parse } from '@vanillaes/csv';

const API_URL_CSV_MAS = 'https://docs.google.com/spreadsheets/d/10EfgAgU6cHmwWyWDHKexkwj_soBubgHz4_VNykPBQDo/export?format=csv&gid=1855810409';
const API_URL_CSV_APD = 'https://docs.google.com/spreadsheets/d/10EfgAgU6cHmwWyWDHKexkwj_soBubgHz4_VNykPBQDo/export?format=csv&gid=1180914346';
export type Difficulty = "Expert" | "Master" | "Append";

export const isDifficulty = (s: string): s is Difficulty => {
    return ["Expert", "Master", "Append"].includes(s);
}

export type Song = {
    songNameEn: string;
    songNameJp: string;
    diffConstant: number;
    FC_const: number;
    AP_const: number;
    diffLevel: string;  // e.g. can be "APD 30"
    noteCount: number;
    difficulty: Difficulty;
    songId: string;
    uid: string;
}

type SongMap = Record<string, Song>;

type LoadingState<T> = {
    state: "loading",
    data: null;
    error: null;
} | {
    state: "loaded"
    data: T;
    error: null;
} | {
    state: "error"
    data: null;
    error: Error;
}

export const $chartConstantData = signal<LoadingState<SongMap>>({
    state: 'loading',
    data: null,
    error: null,
});

export const $sortedIds = computed(() => {
    const songData = $chartConstantData.value;
    if (songData.data == null) {
        throw Error("chart contants are not loaded");
    }
    return Object.values(songData.data)
        .toSorted((a, b) => b.AP_const - a.AP_const)
        .map(song => song.uid);
});
const newSongData: SongMap = {};
async function fetchData(sheet: string) {
    try {
        const response = await fetch(sheet);
        const text = await response.text();
        const data: string[][] = parse(text);  // this is now an array of arrays
        const dataWithoutFirstRow = data.slice(1);  // first row is header
        dataWithoutFirstRow.forEach(row => {
            const songId = row[7];
            const FC_const = parseFloat(row[2]);
            const AP_const = parseFloat(row[3]);
            if (songId === '' || Number.isNaN(FC_const) || Number.isNaN(AP_const)) {
                // skip this row, we don't have enough information to use this chart
                console.log('skipping row', row);
            }
            else{
            const songNameEn = row[0];
            const songNameJp = row[1];
            const diffLevel = row[4];
            const noteCount = parseInt(row[5]);
            const difficulty = isDifficulty(row[6]) ? row[6] : "Expert";
            if (!isDifficulty(row[6])) {
                console.warn(`Song ${songNameEn} has an unknown difficulty, falling back to Expert`)
            }
            const uid = songId + difficulty;
            const newRow = {
                songNameEn: songNameEn,
                songNameJp: songNameJp,
                FC_const: FC_const,
                AP_const: AP_const,
                diffConstant: 0,
                diffLevel: diffLevel,
                noteCount: noteCount,
                difficulty: difficulty,
                songId: songId,
                uid: uid,
            };
            newSongData[newRow['uid']] = newRow;
        }
        });
        $chartConstantData.value = {
            state: 'loaded',
            data: newSongData,
            error: null,
        };
    } catch (e) {
        const error = e instanceof Error ? e : new Error('Unknown error');
        $chartConstantData.value = {
            state: 'error',
            data: null,
            error,
        };
    }
}

fetchData(API_URL_CSV_MAS); 
// fix someday
// fetchData(API_URL_CSV_APD);