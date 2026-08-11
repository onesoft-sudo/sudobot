import packageJSON from "@root/package.json" with { type: "json" };
import chalk from "chalk";
import figlet from "figlet";
import figletBigFont from "figlet/importable-fonts/Big.js";

class BannerPrinter {
    public static async printBanner() {
        figlet.parseFont("customBig", figletBigFont);

        console.info();
        console.info(
            chalk.blueBright(
                (await figlet.text("SudoBot", { font: "customBig" })).replace(
                    /\s+$/,
                    ""
                )
            )
        );
        console.info();
        console.info(
            `      Version ${chalk.green(packageJSON.version)} -- booting up`
        );
        console.info();
    }
}

export default BannerPrinter;
