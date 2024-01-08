import styles from "@/styles/Navbar.module.css";
import { GITHUB_REPO_URL } from "@/utils/links";
import { pages } from "@/utils/pages";
import Button from "@mui/material/Button";
import Image from "next/image";
import { MdMenu } from "react-icons/md";
import logo from "../../images/sudobot.png";
import GitHubStats from "./GitHubStats";
import NavbarClientSide from "./NavbarClientSIde";

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <div className="mobile">
                <Button style={{ minWidth: 0, color: "white" }}>
                    <MdMenu size={23} />
                </Button>
            </div>

            <a className={styles.logoWrapper} href="/">
                <Image src={logo.src} alt="Logo" height={128} width={128} />
                <span>SudoBot</span>
            </a>

            <ul className={`${styles.ul} desktop`}>
                {pages.map((link) => (
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

            <GitHubStats className="desktop" url={GITHUB_REPO_URL} />

            <div className="mobile w-[1rem]"></div>

            <NavbarClientSide />
        </nav>
    );
}
