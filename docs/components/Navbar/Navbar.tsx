import styles from "@/styles/Navbar.module.css";
import { pages } from "@/utils/pages";
import Image from "next/image";
import logo from "../../images/sudobot.png";
import Search from "../Searching/Search";
import NavbarClientSide from "./NavbarClientSIde";

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <a className={styles.logoWrapper} href="/">
                <Image src={logo.src} alt="Logo" height={128} width={128} />
                <span className="mobile">SudoBot</span>
                <span className="desktop">SudoBot Docs</span>
            </a>

            <ul className={`${styles.ul} desktop`}>
                {pages.map(link => (
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

            {/* <GitHubStats className="desktop" url={GITHUB_REPO_URL} /> */}
            <Search />

            <NavbarClientSide />
        </nav>
    );
}
