import Link from "@/components/Navigation/Link";
import styles from "@/styles/Navbar.module.css";
import { pages } from "@/utils/pages";
import Image from "next/image";
import logo from "../../images/sudobot.png";
import Search from "../Searching/Search";
import NavbarClientSide from "./NavbarClientSide";
import { NavbarTitle } from "./NavbarTitle";

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <a className={styles.logoWrapper} href="/">
                <Image src={logo.src} alt="Logo" height={128} width={128} />
                <span className="mobile">SudoBot</span>
                <NavbarTitle />
            </a>

            <ul className={`${styles.ul} desktop`}>
                {pages.map(link => {
                    const LinkComponent = link.url.startsWith("/") ? Link : "a";
                    return (
                        <li key={`${link.url}_${link.name}`}>
                            <LinkComponent
                                href={link.url}
                                {...(/^http(s?):\/\//gi.test(link.url)
                                    ? { target: "_blank", rel: "noreferrer" }
                                    : {})}
                                title={link.name}
                            >
                                {link.name}
                            </LinkComponent>
                        </li>
                    );
                })}
            </ul>

            <Search />

            <NavbarClientSide />
        </nav>
    );
}
