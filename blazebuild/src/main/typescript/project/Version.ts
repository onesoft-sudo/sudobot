import { SemVer } from "semver";
import util from "util";

export class Version {
    public readonly major: number;
    public readonly minor: number;
    public readonly patch: number;
    public readonly prerelease: ReadonlyArray<string | number>;
    public readonly build: ReadonlyArray<string>;
    public readonly raw: string | null;

    private readonly sv: SemVer;
    private cached?: string;

    public constructor(
        raw: string | null = null,
        major = 0,
        minor = 0,
        patch = 0,
        prerelease: string | number | ReadonlyArray<string | number> = [],
        build: ReadonlyArray<string> = [],
        sv: SemVer | null = null
    ) {
        this.raw = raw;
        this.major = major;
        this.minor = minor;
        this.patch = patch;
        this.prerelease = Array.isArray(prerelease) ? [...prerelease] : [prerelease];
        this.build = build;
        this.sv = sv ?? new SemVer(this.toString());
    }

    public toString() {
        if (this.raw) {
            return this.raw;
        }

        if (this.cached) {
            return this.cached;
        }

        let str = `${this.major}.${this.minor}.${this.patch}`;

        for (let i = 0; i < this.prerelease.length; i++) {
            str += `${i === 0 ? "-" : "."}${this.prerelease[i]}`;
        }

        for (let i = 0; i < this.build.length; i++) {
            str += `${i === 0 ? "+" : "."}${this.build[i]}`;
        }

        this.cached = str;
        return str;
    }

    public compare(other: Version): -1 | 0 | 1 {
        return this.sv.compare(other.sv);
    }

    public [util.inspect.custom]() {
        return `[Version: ${this.toString()}]`;
    }

    public static from(raw: string): Version {
        const sv = new SemVer(raw);
        return new Version(raw, sv.major, sv.minor, sv.patch, sv.prerelease, sv.build, sv);
    }
}
