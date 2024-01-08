import styles from "@/styles/GitHubStats.module.css";
import { ComponentProps } from "react";
import { FaCodeFork, FaEye, FaGithub, FaStar } from "react-icons/fa6";

type GitHubStatsProps = ComponentProps<"a"> & {
    url: string;
};

async function getData(repoName: string) {
    const response = await fetch(`https://api.github.com/repos/${repoName}`, {
        next: { revalidate: 3600 },
    });

    if (!response.ok) {
        return {
            error: true,
        };
    }

    const json = await response.json();

    return {
        stars: json.stargazers_count,
        forks: json.forks,
        watchers: json.subscribers_count,
    };
}

export default async function GitHubStats({
    url,
    className,
    ...props
}: GitHubStatsProps) {
    const repoName = url.replace(/^http(s?):\/\/github.com\//gi, "");
    const { error, forks, stars, watchers } = await getData(repoName);

    return (
        <a
            className={`${styles.main} ${className}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            {...props}
        >
            <div className={styles.repo}>
                <FaGithub size={17} />
                <span>{repoName}</span>
            </div>

            {!error && (
                <div className={styles.stats}>
                    <div>
                        <FaStar />
                        <span>{stars}</span>
                    </div>

                    <div>
                        <FaCodeFork />
                        <span>{forks}</span>
                    </div>

                    <div>
                        <FaEye />
                        <span>{watchers}</span>
                    </div>
                </div>
            )}
        </a>
    );
}
