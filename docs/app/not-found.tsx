import styles from "@/styles/Error.module.css";
import { SUPPORT_EMAIL_ADDRESS } from "@/utils/links";
import { Button } from "@mui/material";
import { headers } from "next/headers";
import { MdError } from "react-icons/md";

export const metadata = {
    title: "404 Not Found",
    description: "This page doesn't exist!",
};

export default function NotFound() {
    return (
        <main className={styles.main}>
            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-red-500 flex justify-center items-center gap-3">
                <MdError className="scale-[1.1]" />
                <span>404 Not Found</span>
            </h1>
            <h3 className="text-xl lg:text-3xl py-2">Page not found</h3>

            <p className="text-[#aaa] mt-5">
                The requested URL{" "}
                <span className="font-mono text-white font-bold">
                    {headers().get("x-invoke-url")}
                </span>{" "}
                was not found on this server. Are you sure the URL you&lsquo;ve
                tried to access is right?
            </p>
            <p className="text-[#aaa] mb-5">
                If you think this should not happen, then please contact the
                webmaster at{" "}
                <a href={`mailto:${SUPPORT_EMAIL_ADDRESS}`}>
                    {SUPPORT_EMAIL_ADDRESS}
                </a>
                .
            </p>

            <Button href="/">Go back to home page</Button>
        </main>
    );
}
