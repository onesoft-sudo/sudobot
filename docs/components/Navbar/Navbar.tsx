import styles from "@/styles/Navbar.module.css";
import {
    BOT_INVITE_REQUEST_URL,
    DISCORD_URL,
    DONATION_URL,
    GITHUB_REPO_URL,
    SUPPORT_EMAIL_ADDRESS,
} from "@/utils/links";
import Image from "next/image";
import logo from "../../images/sudobot.png";
import GitHubStats from "./GitHubStats";

const mainLinks = [
    {
        name: "Home",
        url: "/",
    },
    {
        name: "FAQ",
        url: "/",
    },
    {
        name: "Invite",
        url: BOT_INVITE_REQUEST_URL,
    },
    {
        name: "Support",
        url: SUPPORT_EMAIL_ADDRESS,
    },
    {
        name: "Donate",
        url: DONATION_URL,
    },
    {
        name: "Discord",
        url: DISCORD_URL,
    },
];

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <a className={styles.logoWrapper} href="/">
                <Image src={logo.src} alt="Logo" height={128} width={128} />
                <span>SudoBot</span>
            </a>

            <ul className={styles.ul}>
                {mainLinks.map((link) => (
                    <li key={`${link.url}_${link.name}`}>
                        <a
                            href={link.url}
                            {...(/^http(s?):\/\//gi.test(link.url)
                                ? { target: "_blank", rel: "noreferrer" }
                                : {})}
                            title={link.name}
                        >
                            {link.name}
                        </a>
                    </li>
                ))}
            </ul>

            <GitHubStats url={GITHUB_REPO_URL} />
        </nav>
    );
}
